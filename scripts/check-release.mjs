import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {buildGitInventory} from "./build-inventory.mjs";
import {inventoryBytes,sha256Hex,verifyInventoryFile} from "../tools/release-inventory.mjs";
const sha=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
if(!/^[a-f0-9]{40}$/.test(sha))throw Error("INVALID_SHA");
const manifest=JSON.parse(readFileSync("manifest.json","utf8"));
if(manifest.name!=="Linggau AI Studio"||manifest.entry!=="src/app.js"||!/^\d+\.\d+\.\d+$/.test(manifest.version)||![1,2].includes(manifest.shellApi)||manifest.release!==manifest.version)throw Error("MANIFEST_INVALID");
const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"}).split("\0").filter(Boolean);
const patterns=[/\bAIza[0-9A-Za-z_-]{35}\b/,/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const file of files.filter(p=>/^(src\/|canvas\/|\.github\/|tools\/|scripts\/)/.test(p)&&/\.(?:html|js|mjs|json|yml|yaml|css|svg)$/.test(p))){
 const source=readFileSync(file,"utf8");
 if(patterns.some(p=>p.test(source)))throw Error("POSSIBLE_SECRET_IN_"+file);
}
const shell=readFileSync("canvas/shell.html","utf8");
if((shell.match(/\b(?:const|let|var)\s+apiKey\b/g)||[]).length!==1||!/^const apiKey\s*=\s*""\s*;\s*$/m.test(shell))throw Error("NONEMPTY_OR_MISSING_API_KEY_DECLARATION");
console.log("SOURCE_CHECK_PASS",sha);
if(process.argv.includes("--cdn")){
 const inventory=buildGitInventory(sha);
 const targets=files.filter(p=>p.startsWith("src/")||p==="manifest.json").sort();
 if(JSON.stringify(targets)!==JSON.stringify(inventory.files.map(f=>f.path)))throw Error("INVENTORY_CHECKOUT_DRIFT");
 for(const file of targets){
   await verifyInventoryFile(inventory,file,readFileSync(file));
   const response=await fetch("https://cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper@"+sha+"/"+file,{redirect:"error",signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error("CDN_HTTP_"+response.status+"_"+file);
   const remote=new Uint8Array(await response.arrayBuffer());
   await verifyInventoryFile(inventory,file,remote);
 }
 console.log("RELEASE_INVENTORY_PASS",sha,targets.length,await sha256Hex(inventoryBytes(inventory)));
 console.log("IMMUTABLE_CDN_PASS",sha,targets.length);
}
