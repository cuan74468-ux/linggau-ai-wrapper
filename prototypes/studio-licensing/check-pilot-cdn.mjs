import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {APP_REF,LICENSE_REF} from "./build-pilot-shell.mjs";
const base="https://cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper";
const digest=b=>createHash("sha256").update(b).digest("hex");
const git=(args)=>execFileSync("git",args,{maxBuffer:16*1024*1024});
export function expectedFiles(){
 const app=git(["ls-tree","-r","--name-only","-z",APP_REF,"src","manifest.json"]).toString().split("\0").filter(Boolean).sort();
 if(!app.includes("src/app.js")||!app.includes("manifest.json")||app.length<40||app.length>100)throw Error("APP_INVENTORY_INVALID");
 return [...app.map(path=>({ref:APP_REF,path})),...["client.mjs","gate.mjs","login-ui.mjs"].map(name=>({ref:LICENSE_REF,path:"prototypes/studio-licensing/"+name}))];
}
export async function verifyRemote({ref,path},fetcher=fetch){
 if(![APP_REF,LICENSE_REF].includes(ref)||!(/^(src\/|prototypes\/studio-licensing\/)/.test(path)||path==="manifest.json")||path.includes(".."))throw Error("TARGET_INVALID");
 const expected=git(["show",ref+":"+path]),url=base+"@"+ref+"/"+path;
 const res=await fetcher(url,{redirect:"error",credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error("CDN_HTTP_"+res.status+" "+path);
 if(/\.(mjs|js)$/.test(path)){
  if(!/javascript|ecmascript/i.test(res.headers.get("content-type")||""))throw Error("CDN_MODULE_MIME "+path);
  if(res.headers.get("access-control-allow-origin")!=="*")throw Error("CDN_MODULE_CORS "+path);
 }
 const remote=Buffer.from(await res.arrayBuffer());
 if(remote.length!==expected.length||digest(remote)!==digest(expected))throw Error("CDN_BYTES_MISMATCH "+path);
 return {ref,path,sha256:digest(expected),bytes:expected.length};
}
async function main(){
 const targets=expectedFiles(),results=[];
 for(let i=0;i<targets.length;i+=6)results.push(...await Promise.all(targets.slice(i,i+6).map(t=>verifyRemote(t))));
 console.log("STUDIO_PILOT_CDN_PASS app="+APP_REF+" license="+LICENSE_REF+" files="+results.length+" inventory_sha256="+digest(JSON.stringify(results)));
}
main().catch(e=>{console.error("STUDIO_PILOT_CDN_FAIL",e.message);process.exitCode=1;});
