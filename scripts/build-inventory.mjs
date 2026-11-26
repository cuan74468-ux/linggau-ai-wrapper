// Build from Git object bytes, not mutable working-tree content.
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {validateInventory,isInventoryPath} from "../tools/release-inventory.mjs";
const hash=b=>createHash("sha256").update(b).digest("hex");
export function buildGitInventory(commit,{cwd=process.cwd()}={}){
 if(typeof commit!=="string"||!/^[a-f0-9]{40}$/.test(commit))throw Error("INVALID_SHA");
 const git=(args)=>execFileSync("git",args,{cwd,maxBuffer:64*1024*1024});
 if(git(["rev-parse","--verify",commit+"^{commit}"]).toString().trim()!==commit)throw Error("INVALID_COMMIT");
 const rows=git(["ls-tree","-r","-z",commit]).toString("utf8").split("\0").filter(Boolean),files=[];
 let total=0;
 for(const row of rows){
  const at=row.indexOf("\t"),path=row.slice(at+1);
  if(path!=="manifest.json"&&!path.startsWith("src/"))continue;
  const [mode,type,oid]=row.slice(0,at).split(" ");
  if(!isInventoryPath(path)||type!=="blob"||!["100644","100755"].includes(mode)||!(/^[a-f0-9]{40}$/.test(oid)))throw Error("INVENTORY_UNSAFE_GIT_ENTRY");
  const size=Number(git(["cat-file","-s",oid]).toString().trim());
  if(!Number.isSafeInteger(size)||size<0||size>16*1024*1024||files.length>=512||(total+=size)>64*1024*1024)throw Error("INVENTORY_LIMIT");
  const bytes=git(["cat-file","blob",oid]);
  if(bytes.length!==size)throw Error("INVENTORY_GIT_SIZE");
  files.push({path,size,sha256:hash(bytes)});
 }
 files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 return validateInventory({schema:1,commit,files});
}
