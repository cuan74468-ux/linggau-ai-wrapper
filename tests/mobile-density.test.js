import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/app.js",import.meta.url),"utf8"),css=readFileSync(new URL("../src/styles/studio.css",import.meta.url),"utf8");
test("choice rows stretch consistently and mobile columns remain equal",()=>{assert.match(css,/grid-auto-rows:1fr/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/choice>span\.choice-caption\{flex:1;width:100%;height:100%/);assert.match(css,/word-break:normal/);});
test("compact mobile rail stays one line with 44px targets and reserved host area",()=>{assert.match(css,/mobile-item\{[^}]*height:44px[^}]*white-space:nowrap/);assert.match(css,/--host-bottom:32px/);assert.match(css,/padding:0 8px calc\(var\(--nav-height\) \+ 12px\)/);assert.doesNotMatch(app,/mobileHint/);});
test("quality instruction remains internal while warnings remain accessible",()=>{assert.doesNotMatch(app,/Standar kualitas alat ini/);assert.match(app,/quality:assessOutput\(f,values,verified,slots\)/);assert.match(app,/checks.filter\(c=>c.state==="warn"\)/);assert.match(app,/Perlu diperiksa/);assert.match(app,/Privasi & informasi/);});
test("selected tool scrolls into horizontal view only when needed",()=>{assert.match(app,/mobileRail.scrollLeft\+=/);assert.match(app,/s.left<r.left\|\|s.right>r.right/);});
