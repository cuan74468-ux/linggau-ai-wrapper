import test from "node:test";
import assert from "node:assert/strict";
import {findFeatures} from "../src/core/feature-registry.js";
import {normalize} from "../src/core/parameters.js";
import {createAIClient} from "../src/core/ai-client.js";
import {processingRoute} from "../src/core/processing-router.js";
import {supportsPrecision} from "../src/core/local-image.js";
const methods={"image-to-image":"editImage","text-to-image":"generateImage","text-to-text":"generateText"};
const features=findFeatures();
const mockImage={mimeType:"image/png",base64:"AAAA"};
test("audit registry contains all forty tools, not just visible forms",()=>assert.equal(features.length,40));
for(const f of features){
 test("contract audit: "+f.id,async()=>{
  const values=Object.fromEntries(f.fields.filter(x=>x.required).map(x=>[x.id,x.options?x.default:"Contoh data uji"]));
  const normalized=normalize(f,values);
  const images=f.slots.map((_,i)=>({...mockImage,base64:i===0?"AAAA":"BBBB"}));
  const calls=[];
  const bridge=Object.fromEntries(Object.values(methods).map(method=>[method,async req=>{
    calls.push({method,req});
    return method==="generateText"?{kind:"text",text:"Hasil fixture"}:{kind:"image",...mockImage};
  }]));
  const client=createAIClient(bridge);
  // Direct client contract (not a claim that UI uses the direct route for local/overlay tools).
  const out=await client.execute(f,values,images);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,methods[f.engine]);
  assert.deepEqual(calls[0].req.images,images);
  assert.ok(calls[0].req.prompt.includes(f.recipe));
  assert.ok(calls[0].req.prompt.length<=12000);
  assert.equal(out.kind,f.engine==="text-to-text"?"text":"image");
  assert.equal(client.busy(),false);
  const route=processingRoute(f,false,normalized);
  if(f.id==="sharpen")assert.deepEqual(route,{kind:"local-sharpen",needsAI:false});
  else if(["poster","thumbnail"].includes(f.id))assert.deepEqual(route,{kind:"text-overlay",needsAI:true});
  else assert.deepEqual(route,{kind:"generate",needsAI:true});
  if(supportsPrecision(f.id)){
   const transparent=processingRoute(f,true,{...normalized,transparent:true});
   assert.equal(transparent.kind,"preserve");assert.equal(transparent.needsAI,false);
  }
  if(images.length){await assert.rejects(client.execute(f,values,images.slice(1)));assert.equal(calls.length,1);}
  const required=f.fields.find(x=>x.required&&!x.options);
  if(required){await assert.rejects(client.execute(f,{...values,[required.id]:""},images));assert.equal(calls.length,1);}
  let failures=0;
  const failed=createAIClient({[methods[f.engine]]:async()=>{failures++;throw Error("AI_HTTP_429");}});
  await assert.rejects(failed.execute(f,values,images),/429/);
  assert.equal(failures,1);assert.equal(failed.busy(),false);
 });
}
