import test from "node:test";
import assert from "node:assert/strict";
import {PHOTO_FEATURES,PHOTO_SCOPES} from "../src/features/photo-expansion.js";
import {getFeature} from "../src/core/feature-registry.js";
import {normalize} from "../src/core/parameters.js";
import {buildPrompt} from "../src/core/universal-lock.js";
test("13 photo tools have dedicated scopes, methods and reference contracts",()=>{assert.equal(PHOTO_FEATURES.length,13);for(const f of PHOTO_FEATURES){const v=Object.fromEntries(f.fields.filter(p=>p.required).map(p=>[p.id,"contoh"]));const prompt=buildPrompt(f,normalize(f,v));assert.ok(PHOTO_SCOPES[f.id]);assert.match(prompt,/AUTHORIZED FEATURE EXCEPTION/);assert.match(prompt,/FINAL IDENTITY CHECK/);assert.match(prompt,/PRODUCTION METHOD/);}});
test("hair and expression exceptions do not authorize replacing identity",()=>{const hair=getFeature("hair-style"),expression=getFeature("expression-edit");assert.match(buildPrompt(hair,normalize(hair)),/hair except the selected visible hair style/);assert.match(buildPrompt(expression,normalize(expression)),/expression except the selected muscle movement/);assert.match(buildPrompt(expression,normalize(expression)),/Do not generate a new face/);});
test("review and style reference roles are separated",()=>{const f=getFeature("studio-review");assert.match(buildPrompt(f,normalize(f,{reviewBrief:"demo"})),/Image 2: Foto model dewasa/);const s=getFeature("style-match");assert.match(buildPrompt(s,normalize(s)),/image 2 supplies general visual cues only/);});
