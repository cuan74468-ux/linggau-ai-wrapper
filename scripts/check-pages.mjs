// Verify published pointer parity without changing release state.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
const base="https://cuan74468-ux.github.io/linggau-ai-wrapper/";
const raw="https://raw.githubusercontent.com/cuan74468-ux/linggau-ai-wrapper/";
const pairs=[["channel.json","preview-channel/channel.json"],["manifest.json","main/manifest.json"]];
async function json(url,pages=false){
 const r=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(10000),cache:"no-store",headers:pages?{Origin:"https://gemini.google.com"}:{}});
 if(!r.ok)throw Error("HTTP "+r.status+" "+url);
 if(pages&&!["*","https://gemini.google.com"].includes(r.headers.get("access-control-allow-origin")))throw Error("PAGES_CORS_MISSING "+url);
 if(!(r.headers.get("content-type")||"").includes("json"))throw Error("POINTER_CONTENT_TYPE "+url);
 return r.json();
}
for(let attempt=0;attempt<6;attempt++){
 try{
  for(const [file,upstream] of pairs){
   const expected=JSON.parse(readFileSync("docs/"+file,"utf8"));
   assert.deepEqual(await json(raw+upstream),expected,"Raw pointer drift "+file);
   assert.deepEqual(await json(base+file+"?revision="+(process.env.GITHUB_SHA||"check"),true),expected,"Pages pointer drift "+file);
   console.log("PAGES_POINTER_PASS",file,expected.commit||expected.version);
  }
  break;
 }catch(e){if(attempt===5)throw e;console.warn("PAGES_NOT_READY",String(e.message).slice(0,200));await delay(10000);}
}
