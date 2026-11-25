import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../canvas/shell.html",import.meta.url),"utf8");
const script=html.split("<script>")[1].split("function mutableManifestURL(")[0];
const img={mimeType:"image/jpeg",base64:"AAAA"};
function setup(fetch){
  const ctx=vm.createContext({fetch,performance,AbortController,setTimeout,clearTimeout});
  vm.runInContext(script+"\n globalThis.bridge=aiBridge;globalThis.validate=validateManifest;",ctx);
  return ctx;
}
function res(parts,status=200){return {ok:status===200,status,json:async()=>({candidates:[{content:{parts}}]})};}
test("shell manifest supports rollback and candidate, rejects paths",()=>{
  const {validate}=setup(()=>{});
  const base={name:"Linggau AI Studio",shellApi:2,version:"0.2.0",commit:"a".repeat(40),entry:"src/app.js"};
  assert.equal(validate(base).bridgeApi,2);assert.throws(()=>validate({...base,entry:"../x.js"}));
});
test("image request sends ordered references and ratio, key stays empty",async()=>{
  let calls=0;const {bridge}=setup(async(url,options)=>{calls++;assert.match(url,/gemini-3.1-flash-image:generateContent\?key=$/);const p=JSON.parse(options.body);assert.equal(p.contents[0].parts[2].inlineData.data,"BBBB");assert.equal(p.generationConfig.imageConfig.aspectRatio,"4:5");return res([{inlineData:{mimeType:img.mimeType,data:img.base64}}]);});
  const result=await bridge.editImage({prompt:"test",images:[img,{...img,base64:"BBBB"}],aspectRatio:"4:5"});assert.equal(result.kind,"image");assert.equal(calls,1);
});
test("text-to-image sends no references",async()=>{const {bridge}=setup(async(url,o)=>{assert.match(url,/gemini-3.1-flash-image/);assert.equal(JSON.parse(o.body).contents[0].parts.length,1);return res([{inlineData:{mimeType:img.mimeType,data:img.base64}}]);});assert.equal((await bridge.generateImage({prompt:"test"})).kind,"image");});
test("text transport uses text model and excludes thoughts",async()=>{const {bridge}=setup(async(url,o)=>{assert.match(url,/gemini-3-flash-preview/);assert.deepEqual(JSON.parse(o.body).generationConfig.responseModalities,["TEXT"]);return res([{thought:true,text:"hidden"},{text:"visible"}]);});assert.equal((await bridge.generateText({prompt:"test"})).text,"visible");});
test("401/403/429 no retry, subsequent manual attempt allowed",async()=>{let calls=0;const codes=[401,403,429,200];const {bridge}=setup(async()=>res([{inlineData:{mimeType:img.mimeType,data:img.base64}}],codes[calls++]));for(const c of codes.slice(0,3))await assert.rejects(bridge.editImage({prompt:"test",images:[img]}),new RegExp(String(c)));assert.equal((await bridge.editImage({prompt:"test",images:[img]})).httpStatus,200);assert.equal(calls,4);});
test("invalid request never sent",async()=>{const {bridge}=setup(async()=>{throw Error("unexpected fetch");});await assert.rejects(bridge.editImage({prompt:"test",images:[]}),/AI_INPUT_INVALID/);await assert.rejects(bridge.generateText({prompt:"test",aspectRatio:"1:1"}),/AI_INPUT_INVALID/);});
test("output without image fails closed",async()=>{const {bridge}=setup(async()=>res([{text:"no image"}]));await assert.rejects(bridge.editImage({prompt:"test",images:[img]}),/AI_NO_VALID_IMAGE/);});

test("cancelled request never sends data",async()=>{let calls=0;const {bridge}=setup(async()=>{calls++;return res([])});const c=new AbortController();c.abort();await assert.rejects(bridge.generateText({prompt:"test",signal:c.signal}),/AI_CANCELLED/);assert.equal(calls,0);});
