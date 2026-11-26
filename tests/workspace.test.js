import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/styles/studio.css",import.meta.url),"utf8");
test("sidebar uses registry, search, expandable categories, and current tool",()=>{assert.match(app,/const matches=findFeatures\(sideSearch.value\)/);assert.match(app,/el\("details",null,"nav-category"\)/);assert.match(app,/current\?\.id===f.id/);assert.match(app,/workspace\(f\)/);});
test("mobile navigation uses registry and horizontal scroll, desktop sidebar preserved",()=>{assert.match(app,/mobileItem\(cat,/);assert.match(app,/categoryView\(cat\)/);assert.match(app,/aria-current/);assert.doesNotMatch(app,/setDrawer\(/);assert.match(css,/grid-template-columns:260px minmax\(0,1fr\)/);assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/mobile-rail\{[^}]*overflow-x:auto/);});
test("feature-driven form and result panel remain separate",()=>{assert.match(app,/f.slots.forEach/);assert.match(app,/for\(const field of f.fields\)/);assert.match(app,/layout.append\(form,output\)/);assert.match(app,/client.execute\(f,/);});

import { mount } from "../src/app.js";
import { findFeatures, getFeature } from "../src/core/feature-registry.js";
import { normalize } from "../src/core/parameters.js";
import { buildPrompt } from "../src/core/universal-lock.js";
test("app module parses and exports mount",()=>assert.equal(typeof mount,"function"));
test("all eight schemas normalize and include every selected parameter",()=>{for(const f of findFeatures()){const input={};for(const field of f.fields){if(field.required)input[field.id]="contoh";if(field.options)input[field.id]=field.options.at(-1);}const values=normalize(f,input);const prompt=buildPrompt(f,values);for(const field of f.fields.filter(x=>x.options&&x.id!=="ratio"))assert.ok(prompt.includes(field.label+": "+values[field.id]),f.id+":"+field.id);}});
test("distinct product, food, model and fashion controls",()=>{for(const [id,field] of [["product-photo","composition"],["food-photo","scene"],["ai-model","framing"],["virtual-try-on","garment"],["sharpen","noise"],["poster","format"],["seo-caption","platform"],["background","customBackground"]])assert.ok(getFeature(id).fields.some(f=>f.id===field));});
