import test from "node:test";import assert from "node:assert/strict";import {webcrypto} from "node:crypto";
import {releaseSigningBytes,signatureToBase64Url} from "../tools/release-envelope.mjs";
import {inventoryBytes,sha256Hex} from "../tools/release-inventory.mjs";
import {readSignedLKG,mountAndRememberSigned,verifySignedRecord} from "../tools/signed-lkg.mjs";
const subtle=webcrypto.subtle,key="linggau-signed-v1:lkg:preview";
async function fixture(){
 const pair=await subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]),data=new Map();
 const policy={channel:"preview",floor:1,trustKeys:new Map([["test",pair.publicKey]]),subtle};
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const record=async(sequence=2,commit="a".repeat(40))=>{
  const hash="b".repeat(64),inventory={schema:1,commit,files:[{path:"manifest.json",size:3,sha256:hash},{path:"src/app.js",size:4,sha256:hash}]};
  const payload={schema:1,keyId:"test",channel:"preview",sequence,commit,version:"0.3.0",entry:"src/app.js",minShellApi:2,maxShellApi:3,bridgeApi:2,releasedAt:"2026-11-26T00:00:00.000Z",inventorySha256:await sha256Hex(inventoryBytes(inventory),subtle)};
  const signature=signatureToBase64Url(new Uint8Array(await subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,releaseSigningBytes(payload))));
  return {envelope:{payload,signature},inventory};
 };return {policy,storage,data,record};
}
test("signed LKG only saved after successful trusted mount; failure preserves old record",async()=>{const {record,policy,storage,data}=await fixture();const first=await record();await mountAndRememberSigned(first,{storage,policy,mount:async()=>({})});const old=data.get(key);await assert.rejects(mountAndRememberSigned(await record(3),{storage,policy,mount:async()=>{throw Error("MOUNT_FAILED");}}),/MOUNT_FAILED/);assert.equal(data.get(key),old);assert.equal((await readSignedLKG(storage,policy)).envelope.payload.sequence,2);});
test("cache rechecks signatures and inventory; rejects unsigned, tampered or wrong-channel records",async()=>{const {record,policy,storage,data}=await fixture();const r=await record();for(const bad of [r.envelope.payload,{...r,envelope:{...r.envelope,payload:{...r.envelope.payload,sequence:8}}},{...r,inventory:{...r.inventory,files:r.inventory.files.map(f=>({...f,size:f.size+1}))}}]){data.set(key,JSON.stringify(bad));assert.equal(await readSignedLKG(storage,policy),null);}data.set(key,JSON.stringify(r));assert.equal(await readSignedLKG(storage,{...policy,floor:3}),null);assert.equal(await readSignedLKG(storage,{...policy,channel:"stable"}),null);});
test("cached sequence refuses older and conflicting valid records; signed rollback needs new sequence",async()=>{const {record,policy,storage}=await fixture(),mount=async()=>({});const opts={policy,storage,mount};await mountAndRememberSigned(await record(5),opts);await assert.rejects(mountAndRememberSigned(await record(4),opts),/SIGNED_SEQUENCE_REJECTED/);await assert.rejects(mountAndRememberSigned(await record(5,"c".repeat(40)),opts),/SIGNED_SEQUENCE_CONFLICT/);assert.equal((await mountAndRememberSigned(await record(6,"c".repeat(40)),opts)).record.envelope.payload.sequence,6);});
test("denied storage does not falsely claim persistence; verification returns snapshots",async()=>{const {record,policy}=await fixture(),r=await record(),verified=await verifySignedRecord(r,policy);r.inventory.files[0].size=999;assert.equal(verified.inventory.files[0].size,3);const storage={getItem(){throw Error("denied");},setItem(){throw Error("denied");}};assert.equal((await mountAndRememberSigned(await record(),{policy,storage,mount:async()=>({})})).persisted,false);});
