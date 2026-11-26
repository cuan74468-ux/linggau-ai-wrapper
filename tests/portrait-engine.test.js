import test from "node:test";import assert from "node:assert/strict";
import {portraitLayers,segmentPortrait} from "../src/core/portrait-engine.js";
const a=()=>({width:5,height:5,alpha:Uint8ClampedArray.from([0,0,0,0,0,0,255,255,255,0,0,255,255,255,0,0,255,255,255,0,0,0,0,0,0])});
const canvas={width:5,height:5,getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray(100).fill(255)})})};
test("runtime portrait pipeline uses both engines sequentially, preserves geometry and does not invent pixels",async()=>{const events=[];const r=await portraitLayers(canvas,{semantic:async()=>{events.push("semantic");return a();},matting:async()=>{events.push("matting");return a();}});assert.deepEqual(events,["semantic","matting"]);assert.deepEqual([...r.combined.alpha],[...a().alpha]);assert.equal(r.combined.engine,"portrait-consensus");});
test("portrait model failure does not silently substitute a generative or incomplete result",async()=>{await assert.rejects(segmentPortrait(canvas,{semantic:async()=>a(),matting:async()=>{throw Error("VISION_MATTE_FAILED");}}),/VISION_MATTE_FAILED/);});
