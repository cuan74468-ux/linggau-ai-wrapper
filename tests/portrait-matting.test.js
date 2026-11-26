import test from "node:test";import assert from "node:assert/strict";
import {matteAlpha} from "../src/core/portrait-matting.js";
test("matte probabilities produce transparent background, opaque core and continuous edge",()=>{assert.deepEqual([...matteAlpha(Float32Array.from([0,.02,.5,.98,1]),5,1)],[0,0,128,255,255]);assert.throws(()=>matteAlpha([NaN],1,1),/PORTRAIT_MASK_INVALID/);assert.throws(()=>matteAlpha([2],1,1),/PORTRAIT_MASK_INVALID/);});
