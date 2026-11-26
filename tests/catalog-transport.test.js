import test from "node:test";import assert from "node:assert/strict";
import {findFeatures,getFeature} from "../src/core/feature-registry.js";
import {createAIClient,MAX_IMAGE,MAX_TOTAL,friendlyError} from "../src/core/ai-client.js";
import {normalize} from "../src/core/parameters.js";
import {processingRoute} from "../src/core/processing-router.js";
const photo={mimeType:"image/png",base64:"AAAA",width:640,height:480};
const output={kind:"image",...photo};
const valuesFor=f=>Object.fromEntries(f.fields.filter(p=>p.required).map(p=>[p.id,"Contoh kebutuhan UMKM"]));
for(const f of findFeatures())test("catalog transport contract: "+f.id,async()=>{
 const calls=[];const mock=method=>async req=>{calls.push({method,req});return method==="generateText"?{kind:"text",text:"Hasil contoh"}:output;};
 const c=createAIClient({editImage:mock("editImage"),generateImage:mock("generateImage"),generateText:mock("generateText")});
 const values=valuesFor(f),images=f.slots.map((_,i)=>({...photo,base64:i?"BBBB":"AAAA"}));
 const route=processingRoute(f,false,values);
 if(route.kind==="local-sharpen"){assert.equal(route.needsAI,false);assert.equal(calls.length,0);return;}
 const r=await c.execute(f,values,images);
 assert.equal(calls.length,1);const {method,req}=calls[0];
 assert.equal(method,{"image-to-image":"editImage","text-to-image":"generateImage","text-to-text":"generateText"}[f.engine]);
 assert.equal(r.kind,f.engine==="text-to-text"?"text":"image");
 assert.equal(req.images.length,f.slots.length);assert.deepEqual(req.images,images.map(({mimeType,base64})=>({mimeType,base64})));
 assert.ok(req.prompt.includes(f.title)&&req.prompt.length<=12000);
 if(f.engine==="text-to-text")assert.equal(req.aspectRatio,undefined);
 assert.equal(c.busy(),false);
});
test("all provider routes refuse unavailable bridge without calling it",async()=>{let calls=0;const fn=async()=>{calls++;return output};const c=createAIClient({available:false,editImage:fn,generateImage:fn,generateText:fn});await assert.rejects(c.execute(getFeature("background"),{},[photo]),/NOT_CONNECTED/);await assert.rejects(c.chat("test"),/NOT_CONNECTED/);await assert.rejects(c.backdrop("test"),/NOT_CONNECTED/);assert.equal(calls,0);});
test("provider cannot claim local pixel verification or user acceptance",async()=>{const c=createAIClient({editImage:async()=>({...output,processing:"precision",pixelVerified:true,referenceReview:"user-accepted",width:99,elapsedMs:-1})});const r=await c.execute(getFeature("background"),{},[photo]);for(const k of ["processing","pixelVerified","referenceReview","width"])assert.equal(r[k],undefined);assert.ok(Number.isFinite(r.elapsedMs)&&r.elapsedMs>=0);});
test("bad output classified as output failure and unlocks all routes",async()=>{const c=createAIClient({editImage:async()=>({kind:"image",mimeType:"image/png",base64:"!"}),generateImage:async()=>({kind:"image",mimeType:"image/svg+xml",base64:"AAAA"}),generateText:async()=>({kind:"text",text:" "})});for(const call of [()=>c.execute(getFeature("background"),{},[photo]),()=>c.backdrop("test"),()=>c.chat("test")]){await assert.rejects(call(),/AI_OUTPUT_INVALID/);assert.equal(c.busy(),false);}});
test("shared lifecycle cancellation is passed to bridge and late results discarded",async()=>{const ctl=new AbortController();let calls=0,done;const c=createAIClient({generateText:req=>{calls++;assert.equal(req.signal,ctl.signal);return new Promise(r=>done=r);}}, {signal:ctl.signal});const p=c.chat("test");ctl.abort();done({kind:"text",text:"late"});await assert.rejects(p,/AI_CANCELLED/);await assert.rejects(c.chat("again"),/AI_CANCELLED/);assert.equal(calls,1);assert.equal(c.busy(),false);});
test("inherited parameter values cannot override defaults; invalid text fails before provider",async()=>{const f=getFeature("product-photo");assert.equal(normalize(f,Object.create({background:"Outdoor"})).background,"Studio beige");assert.throws(()=>normalize(f,null),/INVALID_PARAMETER/);let calls=0;const c=createAIClient({generateText:async()=>{calls++;return {kind:"text",text:"test"}}});await assert.rejects(c.execute(getFeature("seo-caption"),{product:"x".repeat(1201),audience:"a"}),/PARAMETER_TOO_LONG/);assert.equal(calls,0);assert.match(friendlyError(Error("PARAMETER_TOO_LONG_product")),/terlalu panjang/);});
test("two reference size limits enforced before provider",async()=>{const c=createAIClient({editImage:async()=>{throw Error("unexpected call")}}),large={mimeType:"image/png",base64:"AAAA".repeat(Math.ceil((MAX_TOTAL/2+3)/3))};await assert.rejects(c.execute(getFeature("virtual-try-on"),{},[large,large]),/IMAGE_LIMIT/);assert.ok(MAX_IMAGE<MAX_TOTAL);});
