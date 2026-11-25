import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/styles/studio.css",import.meta.url),"utf8");
test("sidebar uses registry, search, expandable categories, and current tool",()=>{assert.match(app,/const matches=findFeatures\(sideSearch.value\)/);assert.match(app,/el\("details",null,"nav-category"\)/);assert.match(app,/current\?\.id===f.id/);assert.match(app,/workspace\(f\)/);});
test("mobile menu has disclosure semantics and desktop layout separates workspace",()=>{assert.match(app,/aria-expanded/);assert.match(app,/aria-controls/);assert.match(app,/e.key==="Escape"/);assert.match(css,/grid-template-columns:260px minmax\(0,1fr\)/);assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/drawer-open \.sidebar\{display:block\}/);});
test("feature-driven form and result panel remain separate",()=>{assert.match(app,/f.slots.forEach/);assert.match(app,/for\(const field of f.fields\)/);assert.match(app,/layout.append\(form,output\)/);assert.match(app,/client.execute\(f,/);});
