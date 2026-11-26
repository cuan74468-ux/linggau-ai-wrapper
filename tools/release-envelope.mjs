// Protocol prototype only: not an active runtime trust anchor.
const fields=["schema","keyId","channel","sequence","commit","version","entry","minShellApi","maxShellApi","bridgeApi","releasedAt","inventorySha256"];
const channels=["stable","preview"];
const exact=(o,k)=>!!o&&typeof o==="object"&&!Array.isArray(o)&&Object.keys(o).length===k.length&&k.every(x=>Object.hasOwn(o,x));
const date=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
export function validateReleasePayload(p){
 if(!exact(p,fields)||p.schema!==1||typeof p.keyId!=="string"||!/^[a-zA-Z0-9_-]{1,64}$/.test(p.keyId)||!channels.includes(p.channel)||!Number.isSafeInteger(p.sequence)||p.sequence<1||typeof p.commit!=="string"||!/^[a-f0-9]{40}$/.test(p.commit)||typeof p.version!=="string"||p.version.length>32||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(p.version)||p.entry!=="src/app.js"||!Number.isInteger(p.minShellApi)||!Number.isInteger(p.maxShellApi)||p.minShellApi<1||p.maxShellApi<p.minShellApi||p.maxShellApi>100||p.bridgeApi!==2||!date(p.releasedAt)||typeof p.inventorySha256!=="string"||!/^[a-f0-9]{64}$/.test(p.inventorySha256))throw Error("SIGNED_PAYLOAD_INVALID");
 return Object.freeze(Object.fromEntries(fields.map(k=>[k,p[k]])));
}
export function releaseSigningBytes(payload){
 const p=validateReleasePayload(payload);
 return new TextEncoder().encode(JSON.stringify(["linggau-ai-studio:release:v1",...fields.map(k=>p[k])]));
}
export function signatureToBase64Url(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length!==64)throw Error("SIGNATURE_INVALID");
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decode(s){
 if(typeof s!=="string"||!/^[a-zA-Z0-9_-]{86}$/.test(s))throw Error("SIGNATURE_INVALID");
 const bytes=Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=="),c=>c.charCodeAt(0));
 if(signatureToBase64Url(bytes)!==s)throw Error("SIGNATURE_INVALID");
 return bytes;
}
// Trust keys and minimum sequence must come from trusted caller state,
// never from the envelope. localStorage alone is not an anti-replay boundary.
export async function verifyReleaseEnvelope(envelope,{channel,trustKeys,floor=1,shellApi=2,subtle=globalThis.crypto?.subtle}={}){
 if(!exact(envelope,["payload","signature"]))throw Error("SIGNED_ENVELOPE_INVALID");
 const p=validateReleasePayload(envelope.payload),sig=decode(envelope.signature);
 if(!channels.includes(channel)||p.channel!==channel)throw Error("SIGNED_CHANNEL_MISMATCH");
 if(!Number.isSafeInteger(floor)||floor<1||p.sequence<floor)throw Error("SIGNED_SEQUENCE_REJECTED");
 if(!Number.isInteger(shellApi)||shellApi<p.minShellApi||shellApi>p.maxShellApi)throw Error("SIGNED_SHELL_INCOMPATIBLE");
 const key=trustKeys instanceof Map?trustKeys.get(p.keyId):null;
 if(!key||key.type!=="public"||key.algorithm?.name!=="ECDSA"||key.algorithm?.namedCurve!=="P-256"||!key.usages?.includes("verify")||!subtle)throw Error("SIGNED_TRUST_KEY_UNAVAILABLE");
 if(!await subtle.verify({name:"ECDSA",hash:"SHA-256"},key,sig,releaseSigningBytes(p)))throw Error("SIGNED_VERIFICATION_FAILED");
 return p;
}
