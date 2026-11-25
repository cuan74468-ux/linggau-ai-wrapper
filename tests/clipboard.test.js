import test from "node:test";
import assert from "node:assert/strict";
import {copyResult} from "../src/app.js";
function field(){return {value:"Judul\n\nIsi",focus(){this.focused=true},select(){this.selected=true},setSelectionRange(a,b){this.range=[a,b]}};}
test("clipboard writes exact text including newlines",async()=>{const f=field();let text;const mode=await copyResult(f,{nav:{clipboard:{writeText:async v=>{text=v}}},doc:{}});assert.equal(mode,"clipboard");assert.equal(text,f.value);});
test("denied clipboard falls back to successful legacy copy",async()=>{const f=field();const mode=await copyResult(f,{nav:{clipboard:{writeText:async()=>{throw Error("NotAllowedError")}}},doc:{execCommand:cmd=>cmd==="copy"}});assert.equal(mode,"legacy");});
test("both copy paths denied leaves text selected and reports manual only",async()=>{const f=field();const mode=await copyResult(f,{nav:{clipboard:{writeText:async()=>{throw Error("denied")}}},doc:{execCommand:()=>false}});assert.equal(mode,"manual");assert.deepEqual(f.range,[0,f.value.length]);assert.ok(f.focused);});
test("missing clipboard and throwing legacy function still leaves manual selection",async()=>{const f=field();assert.equal(await copyResult(f,{nav:{},doc:{execCommand:()=>{throw Error("denied")}}}),"manual");assert.ok(f.selected);});
