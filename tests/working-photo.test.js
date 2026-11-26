import test from "node:test";import assert from "node:assert/strict";
import {workingDimensions} from "../src/core/images.js";
test("working photo geometry fits pixel and side budgets without upscaling",()=>{assert.deepEqual(workingDimensions(800,600),{width:800,height:600});for(const [w,h] of [[4000,3000],[3000,4000],[12000,500],[500,12000],[6000,6000]]){const r=workingDimensions(w,h);assert.ok(r.width*r.height<=4000000);assert.ok(r.width<=4096&&r.height<=4096);assert.ok(Math.abs(r.width/r.height/(w/h)-1)<.01);}});
test("reject invalid dimensions and decoded image above safety bound",()=>{for(const [w,h] of [[0,1],[NaN,2],[10000,10000],[1.5,5]])assert.throws(()=>workingDimensions(w,h),/IMAGE_DIMENSIONS_INVALID/);});
