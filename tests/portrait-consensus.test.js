import test from "node:test";import assert from "node:assert/strict";
import {combinePortraitMasks} from "../src/core/portrait-consensus.js";
const m=a=>({width:a.length,height:1,alpha:Uint8ClampedArray.from(a)});
test("consensus removes weak spill and protects dedicated opaque core",()=>{const a=m([0,0,255,255,255,255,0,0]),b=m([0,80,255,255,255,255,200,0]);const r=combinePortraitMasks(a,b);assert.deepEqual([...r.alpha],[0,0,255,255,255,255,129,0]);assert.equal(b.alpha[1],80);});
test("consensus does not reinstate residue solely because semantic confidence is high",()=>{const a=m([0,255,255,255,255,255,0,0]),b=m([0,255,255,255,255,0,0,0]);assert.equal(combinePortraitMasks(a,b).alpha[5],0);});
test("strong disagreement fails closed",()=>{assert.throws(()=>combinePortraitMasks(m([0,255,255,0,0]),m([0,0,0,255,255])),/MASK_CLEANUP_UNCERTAIN/);});
