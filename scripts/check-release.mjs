import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw Error("INVALID_SHA");
const manifest=JSON.parse(readFileSync("manifest.json","utf8"));
if(manifest.name!=="Linggau AI Studio"||manifest.entry!=="src/app.js"||!/^\d+\.\d+\.\d+$/.test(manifest.version)||![1,2].includes(manifest.shellApi)||manifest.release!==manifest.version)throw Error("MANIFEST_INVALID");
const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const patterns=[/\bAIza[0-9A-Za-z_-]{35}\b/,/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const file of files.filter(p=>/^(src\/|canvas\/|\.github\/)/.test(p)&&/\.(?:html|js|mjs|json|yml|yaml|css|svg)$/.test(p))){
 const source=readFileSync(file,"utf8");
 if(patterns.some(p=>p.test(source)))throw Error("POSSIBLE_SECRET_IN_"+file);
}
if(!/const apiKey\s*=\s*""\s*;/.test(readFileSync("canvas/shell.html","utf8")))throw Error("NONEMPTY_OR_MISSING_API_KEY_GUARD");
console.log("SOURCE_CHECK_PASS",sha);
if(process.argv.includes("--cdn")){
 const hash=b=>createHash("sha256").update(b).digest("hex");
 // Include the complete first-party module graph and assets, not only the entry.
 const targets=files.filter(p=>p.startsWith("src/")||p==="manifest.json");
 for(const file of targets){
   const response=await fetch("https://cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper@"+sha+"/"+file,{redirect:"error",signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error("CDN_HTTP_"+response.status+"_"+file);
   const remote=Buffer.from(await response.arrayBuffer());
   if(hash(remote)!==hash(readFileSync(file)))throw Error("CDN_CONTENT_MISMATCH_"+file);
 }
 console.log("IMMUTABLE_CDN_PASS",sha,targets.length);
}
