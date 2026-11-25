import test from "node:test";
import assert from "node:assert/strict";
import {checkText} from "../src/core/output-contracts.js";
import {getFeature,findFeatures} from "../src/core/feature-registry.js";
import {buildPrompt} from "../src/core/universal-lock.js";
import {normalize} from "../src/core/parameters.js";
const seo="**JUDUL PRODUK**\nTahu\n\n**DESKRIPSI SEO**\nTahu dari kedelai.\n\n**5 KATA KUNCI SUGESTI**\n1. tahu\n2. kedelai\n3. olahan\n4. masakan\n5. bahan pangan\n\n**CAPTION**\nTahu untuk masakan.\n\n**CTA**\nCoba olah tahu.";
const pass=x=>x.every(c=>c.state==="pass");
test("SEO accepts one complete output",()=>assert.ok(pass(checkText("seo-caption",{},seo))));
test("SEO detects empty, repeated, inline or missing sections and duplicate keywords",()=>{
 for(const x of [seo.replace("Tahu dari kedelai.",""),seo+"\nCTA\nUlang",seo.replace("**CTA**","CTA dalam kalimat"),seo.replace("5. bahan pangan","5. tahu")])assert.ok(!pass(checkText("seo-caption",{},x)));
});
test("one TikTok concept, rejects alternative repeated sections",()=>{const t="HOOK\nCoba tahu\nVISUAL\nTahu\nALUR\nMasak tahu\nCTA\nCoba resep";assert.ok(pass(checkText("tiktok-ideas",{},t)));assert.ok(!pass(checkText("tiktok-ideas",{},t+"\n"+t)));});
test("ad script checks duration and gaps",()=>{const t="KONSEP\nTahu\nADEGAN & WAKTU\n0-5s | Buka\n5-15s | Tutup\nNARASI\nTahu\nTEKS LAYAR\nTahu\nCTA\nCoba";assert.ok(pass(checkText("ad-script",{duration:"15 detik"},t)));assert.ok(!pass(checkText("ad-script",{duration:"15 detik"},t.replace("5-15s","6-15s"))));assert.ok(!pass(checkText("ad-script",{duration:"30 detik"},t)));});
test("calendar checks exact day count, order and filled fields",()=>{const day=i=>"HARI\n"+i+"\nFORMAT\nFoto\nTOPIK\nTahu "+i+"\nHOOK\nCoba\nCTA\nLihat";const text=Array.from({length:7},(_,i)=>day(i+1)).join("\n");assert.ok(pass(checkText("content-calendar",{period:"7 hari"},text)));assert.ok(!pass(checkText("content-calendar",{period:"7 hari"},text.replace("HARI\n7","HARI\n6"))));assert.ok(!pass(checkText("content-calendar",{period:"14 hari"},text)));});
test("all existing tools compile one final deliverable",()=>{for(const f of findFeatures()){const v=Object.fromEntries(f.fields.filter(x=>x.required).map(x=>[x.id,"contoh"]));assert.match(buildPrompt(f,normalize(f,v)),/exactly one complete final deliverable/);}});
