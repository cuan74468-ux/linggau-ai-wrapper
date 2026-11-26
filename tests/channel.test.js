import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../canvas/shell.html",import.meta.url),"utf8");
const ctx=vm.createContext({});vm.runInContext(html.slice(html.indexOf("const SHELL_API="),html.indexOf("function deadline("))+"\nglobalThis.check=validateManifest;globalThis.url=mutableManifestURL;",ctx);
const m={name:"Linggau AI Studio",shellApi:2,entry:"src/app.js",commit:"a".repeat(40),version:"0.2.0"};
test("SHA only; reject malformed module path, channel and incompatible shell",()=>{assert.equal(ctx.check(m).commit,m.commit);for(const bad of ["main","https://example.com","a".repeat(39),["a".repeat(40)]])assert.throws(()=>ctx.check({...m,commit:bad}));assert.throws(()=>ctx.check({...m,entry:"../app.js"}));assert.throws(()=>ctx.check({...m,shellApi:3}));});
test("new compatibility range includes current shell and refuses newer minimum",()=>{const n={...m,minShellApi:2,maxShellApi:3,bridgeApi:2};assert.equal(ctx.check(n).maxShellApi,3);assert.throws(()=>ctx.check({...n,minShellApi:3}),/SHELL_UPDATE_REQUIRED/);});
test("legacy stable tag resolves to reviewed full SHA, not executable tag URL",()=>{const x=ctx.check({name:m.name,shellApi:1,version:"0.1.0",release:"0.1.0",entry:m.entry});assert.equal(x.commit,"973894e854a65ad69aca0e99a43de2fb9d0a073c");assert.throws(()=>ctx.check({name:m.name,shellApi:2,version:"0.2.0",release:"0.2.0",entry:m.entry}));assert.equal(ctx.check({name:m.name,shellApi:2,version:"0.2.0",release:"0.2.0",entry:m.entry},m.commit).commit,m.commit);});
test("mutable source uses GitHub Pages, not mutable CDN or Raw",()=>{assert.equal(ctx.url("preview"),"https://cuan74468-ux.github.io/linggau-ai-wrapper/channel.json");assert.equal(ctx.url("stable"),"https://cuan74468-ux.github.io/linggau-ai-wrapper/manifest.json");assert.throws(()=>ctx.url("unknown"));assert.match(html,/CDN\+"@"\+manifest.commit/);});

test("CSP compatibility baseline and no runtime empty-key guard",()=>{assert.match(html,/http-equiv="Content-Security-Policy" content="object-src 'none'; base-uri 'none'; form-action 'none'"/);assert.doesNotMatch(html,/apiKey\s*!==/);assert.doesNotMatch(html,/raw\.githubusercontent\.com|@main\//);});
