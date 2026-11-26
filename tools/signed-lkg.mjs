// Isolated signed release cache prototype. Not used by Canvas runtime.
// Storage is untrusted; caller supplies pinned keys and a trusted minimum.
import {verifyReleaseEnvelope} from "./release-envelope.mjs";
import {verifyInventory} from "./release-inventory.mjs";
const MAX_RECORD=512*1024;
function namespace(channel){if(!["stable","preview"].includes(channel))throw Error("SIGNED_CHANNEL_MISMATCH");return "linggau-signed-v1:lkg:"+channel;}
export async function verifySignedRecord(record,policy){
 if(!record||typeof record!=="object"||Object.keys(record).length!==2||!Object.hasOwn(record,"envelope")||!Object.hasOwn(record,"inventory"))throw Error("SIGNED_RECORD_INVALID");
 // Snapshot before async verification; do not return attacker-controlled references.
 const raw=JSON.stringify(record);
 if(!raw||raw.length>MAX_RECORD)throw Error("SIGNED_RECORD_LIMIT");
 const copy=JSON.parse(raw),payload=await verifyReleaseEnvelope(copy.envelope,policy),inventory=await verifyInventory(copy.inventory,payload,policy);
 return Object.freeze({envelope:Object.freeze({payload,signature:copy.envelope.signature}),inventory});
}
export async function readSignedLKG(storage,policy){
 const key=namespace(policy.channel);
 try{const raw=storage.getItem(key);if(typeof raw!=="string"||raw.length>MAX_RECORD)return null;return await verifySignedRecord(JSON.parse(raw),policy);}catch{return null;}
}
// Mount callback is a trusted test seam. It must enforce actual verified execution
// in a future runtime. Rejection must not modify cache. No unsigned fallback.
export async function mountAndRememberSigned(record,{storage,mount,policy}){
 const key=namespace(policy.channel);
 const verified=await verifySignedRecord(record,policy);
 const previous=await readSignedLKG(storage,policy);
 if(previous){
  const a=previous.envelope.payload,b=verified.envelope.payload;
  if(b.sequence<a.sequence)throw Error("SIGNED_SEQUENCE_REJECTED");
  if(b.sequence===a.sequence&&JSON.stringify(a)!==JSON.stringify(b))throw Error("SIGNED_SEQUENCE_CONFLICT");
 }
 if(typeof mount!=="function")throw Error("SIGNED_MOUNT_REQUIRED");
 const handle=await mount(verified);
 let persisted=false;
 try{storage.setItem(key,JSON.stringify(verified));persisted=true;}catch{/* storage unavailable; no persistence claim */}
 return {handle,persisted,record:verified};
}
