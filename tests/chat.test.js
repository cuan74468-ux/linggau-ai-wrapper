import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createChatSession,buildChatPrompt} from "../src/core/chat.js";
import {createAIClient} from "../src/core/ai-client.js";
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8"),css=readFileSync(new URL("../src/styles/studio.css",import.meta.url),"utf8");
test("chat context carries preceding user and assistant turns",()=>{const s=createChatSession();s.append("Nama usaha Bakso Len","Baik");assert.match(s.prompt("Apa nama usaha?"),/Bakso Len/);s.clear();assert.doesNotMatch(s.prompt("Apa nama usaha?"),/Bakso Len/);});
test("chat memory and prompt bounded",()=>{const s=createChatSession();for(let i=0;i<10;i++)s.append("pesan "+i,"a".repeat(9000));assert.equal(s.list().length,8);assert.ok(s.prompt("b".repeat(4000)).length<=12000);assert.throws(()=>buildChatPrompt("x".repeat(4001)));});
test("chat sends exactly one request and shares single flight lock",async()=>{let resolve,calls=0;const client=createAIClient({generateText:()=>{calls++;return new Promise(r=>resolve=r)}});const pending=client.chat("hello");await assert.rejects(client.chat("again"),/AI_BUSY/);resolve({kind:"text",text:"reply"});assert.equal((await pending).text,"reply");assert.equal(calls,1);assert.equal(client.busy(),false);});
test("chat has no automatic retry",async()=>{let calls=0;const c=createAIClient({generateText:async()=>{calls++;throw Error("401")}});await assert.rejects(c.chat("hi"));assert.equal(calls,1);assert.equal(c.busy(),false);});
test("chat home, no catalogue, swipe mobile nav and panes",()=>{assert.match(app,/chatHome\(\);renderNavigation\(\)/);assert.match(app,/Aset sesi/);assert.doesNotMatch(app,/function catalog\(/);assert.match(css,/overflow-x:auto/);assert.match(css,/data-pane=input/);assert.match(app,/showPane\("output"\)/);});
test("original logo asset referenced",()=>{assert.match(app,/assets\/linggau-mark.svg/);assert.match(readFileSync(new URL("../src/assets/linggau-mark.svg",import.meta.url),"utf8"),/#ff8c00/);});

test("assistant professional guidance and capability boundaries",()=>{const p=buildChatPrompt("Bantu saya");for(const x of ["SKILLS:","QUALITY LOCK:","CAPABILITY LOCK:","DELIVERY:"])assert.ok(p.includes(x));assert.match(p,/Business\/marketing/);assert.match(p,/never present unconfirmed discounts/);assert.match(p,/without live browsing/);assert.match(p,/contextOmitted/);});
