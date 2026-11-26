// Portable canonical first-party inventory contract. Not an execution loader.
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const MAX_FILE=16*1024*1024,MAX_TOTAL=64*1024*1024,MAX_FILES=512;
const exact=(o,k)=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
export function isInventoryPath(path){
 return typeof path==="string"&&path.length<=240&&(path==="manifest.json"||(/^src\/[A-Za-z0-9_./-]+$/.test(path)&&path.split("/").every(p=>p&&p!=="."&&p!=="..")));
}
export function validateInventory(v){
 if(!exact(v,["schema","commit","files"])||v.schema!==1||typeof v.commit!=="string"||!SHA40.test(v.commit)||!Array.isArray(v.files)||v.files.length<2||v.files.length>MAX_FILES)throw Error("INVENTORY_INVALID");
 let previous="",total=0,entry=false,manifest=false;
 const files=v.files.map(f=>{
  if(!exact(f,["path","size","sha256"])||!isInventoryPath(f.path)||f.path<=previous||!Number.isSafeInteger(f.size)||f.size<0||f.size>MAX_FILE||typeof f.sha256!=="string"||!SHA64.test(f.sha256))throw Error("INVENTORY_FILE_INVALID");
  previous=f.path;total+=f.size;if(total>MAX_TOTAL)throw Error("INVENTORY_LIMIT");
  if(f.path==="src/app.js")entry=true;if(f.path==="manifest.json")manifest=true;
  return Object.freeze({path:f.path,size:f.size,sha256:f.sha256});
 });
 if(!entry||!manifest)throw Error("INVENTORY_REQUIRED_FILE");
 return Object.freeze({schema:1,commit:v.commit,files:Object.freeze(files)});
}
export function inventoryBytes(v){
 const i=validateInventory(v);
 return new TextEncoder().encode(JSON.stringify(["linggau-ai-studio:inventory:v1",i.schema,i.commit,i.files.map(f=>[f.path,f.size,f.sha256])]));
}
export async function sha256Hex(bytes,subtle=globalThis.crypto?.subtle){
 if(!(bytes instanceof Uint8Array)||!subtle)throw Error("INVENTORY_HASH_UNAVAILABLE");
 return Array.from(new Uint8Array(await subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function verifyInventory(v,payload,{subtle=globalThis.crypto?.subtle}={}){
 const i=validateInventory(v);
 if(!payload||payload.commit!==i.commit||typeof payload.inventorySha256!=="string"||!SHA64.test(payload.inventorySha256))throw Error("INVENTORY_BINDING_INVALID");
 if(await sha256Hex(inventoryBytes(i),subtle)!==payload.inventorySha256)throw Error("INVENTORY_DIGEST_MISMATCH");
 return i;
}
// Caller must use the returned verified bytes, not assume a later fetch is identical.
export async function verifyInventoryFile(inventory,path,bytes,{subtle=globalThis.crypto?.subtle}={}){
 const i=validateInventory(inventory),f=i.files.find(x=>x.path===path);
 if(!f)throw Error("INVENTORY_FILE_UNLISTED");
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==f.size)throw Error("INVENTORY_SIZE_MISMATCH");
 // Snapshot before awaiting crypto so a mutable caller cannot race verification.
 const copy=new Uint8Array(bytes);
 if(await sha256Hex(copy,subtle)!==f.sha256)throw Error("INVENTORY_FILE_MISMATCH");
 return copy;
}
