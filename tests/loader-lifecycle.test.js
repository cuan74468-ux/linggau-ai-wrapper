import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../canvas/shell.html",import.meta.url),"utf8");
const script=html.split("<script>")[1].split("</script>")[0].replace("deadline(import(url),","deadline(loadModule(url),").replace(/\nbootstrap\(\);\s*$/,"\nglobalThis.boot=bootstrap;");
const old="a".repeat(40),next="b".repeat(40);
const manifest=commit=>({name:"Linggau AI Studio",version:"0.2.0",shellApi:2,entry:"src/app.js",commit});
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent="";}
 setAttribute(k,v){this.attrs[k]=v;}
 replaceChildren(...nodes){this.children=nodes;}
 append(...nodes){this.children.push(...nodes);}
 prepend(...nodes){this.children.unshift(...nodes);}
 select(){}
}
function environment({pointer=next,failMount=false,failManifest=false,storageDenied=false,seed=null}={}){
 const events=[],writes=[],map=new Map(),root=new Element("main"),handlers={};
 if(seed)map.set("linggau-loader-v2:lkg:preview",JSON.stringify(manifest(seed)));
 const storage={getItem:k=>{if(storageDenied)throw Error("denied");return map.get(k);},setItem:(k,v)=>{if(storageDenied)throw Error("denied");writes.push(JSON.parse(v).commit);map.set(k,v);}};
 const fetch=async url=>{events.push("fetch:"+url);if(url.startsWith("https://cuan74468-ux.github.io/linggau-ai-wrapper/"))return failManifest?{ok:false,status:503}:{ok:true,json:async()=>manifest(pointer)};return {ok:true,headers:{get:()=>"application/javascript"},arrayBuffer:async()=>new Uint8Array([1,2]).buffer};};
 const loadModule=async url=>{events.push("import:"+url);const sha=url.match(/@([a-f0-9]{40})/)[1];return {mount:async({root:staging,signal})=>{events.push("mount:"+sha);if(failMount&&sha===pointer)throw Error("MOUNT_FAILED");assert.equal(signal.aborted,false);staging.textContent="mounted:"+sha;return {unmount(){events.push("unmount:"+sha);staging.replaceChildren();}};}};};
 const ctx=vm.createContext({fetch,loadModule,AbortController,setTimeout,clearTimeout,performance,console:{info(){},error(){}},document:{getElementById:()=>root,createElement:t=>new Element(t)},window:{localStorage:storage,addEventListener:(n,fn)=>handlers[n]=fn},location:{reload(){}},navigator:{}});
 vm.runInContext(script,ctx);return {boot:ctx.boot,events,writes,root,handlers,map};
}
test("successful mount precedes LKG write; next boot unmounts existing workspace",async()=>{const e=environment();await e.boot();assert.equal(e.root.children[0].textContent,"mounted:"+next);assert.deepEqual(e.writes,[next]);assert.ok(e.events.some(x=>x==="mount:"+next));await e.boot();assert.ok(e.events.includes("unmount:"+next));});
test("failed new mount tries previous successful SHA once, never stores broken pointer",async()=>{const e=environment({seed:old,failMount:true});await e.boot();assert.deepEqual(e.events.filter(x=>x.startsWith("mount:")),["mount:"+next,"mount:"+old]);assert.deepEqual(e.writes,[]);assert.match(e.root.children[0].textContent,/Versi terakhir/);assert.equal(e.root.children[1].textContent,"mounted:"+old);});
test("manifest outage falls back to stored successful version without mutable CDN",async()=>{const e=environment({seed:old,failManifest:true});await e.boot();assert.equal(e.root.children[1].textContent,"mounted:"+old);assert.ok(!e.events.some(x=>x.includes("@main/")));});
test("storage denied does not prevent normal mount; no LKG failure renders friendly retry",async()=>{const a=environment({storageDenied:true});await a.boot();assert.equal(a.root.children[0].textContent,"mounted:"+next);assert.deepEqual(a.writes,[]);const b=environment({storageDenied:true,failManifest:true});await b.boot();const screen=b.root.children[0];assert.match(screen.children[1].textContent,/Periksa jaringan/);assert.equal(screen.children[2].textContent,"Coba lagi");assert.equal(screen.children[3].textContent,"Salin detail");assert.doesNotMatch(screen.children[1].textContent,/503|MANIFEST/);});
test("runtime rejection tears down mounted module and shows friendly error",async()=>{const e=environment();await e.boot();e.handlers.unhandledrejection({reason:Error("arbitrary private exception")});assert.ok(e.events.includes("unmount:"+next));assert.equal(e.root.children[0].children[0].textContent,"Aplikasi belum siap");assert.doesNotMatch(e.root.children[0].children[1].textContent,/private/);});
