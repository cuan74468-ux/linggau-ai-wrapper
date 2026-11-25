import test from "node:test";
import assert from "node:assert/strict";
import {EXTRA_FEATURES} from "../src/features/batch-02.js";
import {normalize} from "../src/core/parameters.js";
import {buildPrompt,UNIVERSAL_LOCK} from "../src/core/universal-lock.js";
import {createAIClient} from "../src/core/ai-client.js";
test("batch 02 consists of eight distinct tools and all three engines",()=>{assert.equal(EXTRA_FEATURES.length,8);assert.equal(new Set(EXTRA_FEATURES.map(f=>f.id)).size,8);assert.equal(new Set(EXTRA_FEATURES.map(f=>f.engine)).size,3);});
test("all new tools use central client and their individual recipes",async()=>{const image={mimeType:"image/png",base64:"AAAA"};for(const f of EXTRA_FEATURES){const values=Object.fromEntries(f.fields.filter(p=>p.required).map(p=>[p.id,"Contoh"]));const mock=async req=>{assert.ok(req.prompt.includes(f.recipe));assert.equal(req.images.length,f.slots.length);return f.engine==="text-to-text"?{kind:"text",text:"Hasil"}:{kind:"image",...image};};const c=createAIClient({editImage:mock,generateImage:mock,generateText:mock});await c.execute(f,values,f.slots.map(()=>image));}});
test("reference tools retain universal lock and new text tools constrain claims",()=>{for(const f of EXTRA_FEATURES){const values=Object.fromEntries(f.fields.filter(p=>p.required).map(p=>[p.id,"Contoh"]));const p=buildPrompt(f,normalize(f,values));if(f.engine==="image-to-image")assert.ok(p.includes(UNIVERSAL_LOCK));if(f.engine==="text-to-text")assert.match(p,/hygiene practices/);}});
