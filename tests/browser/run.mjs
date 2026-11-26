import {createServer} from "node:http";
import {readFile,mkdtemp,rm,mkdir,writeFile} from "node:fs/promises";
import {spawn} from "node:child_process";
import {tmpdir} from "node:os";
import {resolve,extname,sep} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
const liveLoader=process.argv.includes("--live-loader");
const license=process.argv.includes("--studio-license");
const pilotDisabled=process.argv.includes("--studio-pilot-disabled");
const pilotConfigured=process.argv.includes("--studio-pilot-configured")||process.argv.includes("--studio-pilot-minified");
const pilotMinified=process.argv.includes("--studio-pilot-minified");
const pilot=pilotDisabled||pilotConfigured;
const fixtureEndpoint="https://script.google.com/macros/s/FIXTURE_ONLY/exec";
let pilotHTML="";

const expectedPreview=liveLoader?JSON.parse(await readFile("docs/channel.json","utf8")).commit:null;
const benchmark=process.argv.includes("--matte-benchmark");
const dailyProduct=process.argv.includes("--daily-product");
const product=dailyProduct||process.argv.includes("--product-benchmark");
const real=benchmark||product||process.argv.includes("--real-vision");
const root=process.cwd(), dir=await mkdtemp(resolve(tmpdir(),"studio-smoke-"));
const types={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};
const benchmarkRows=new Map();
const server=createServer(async(req,res)=>{try{if(pilot&&req.url==="/pilot-shell.html"){res.writeHead(200,{"Content-Type":"text/html"});res.end(pilotHTML);return;}const match=(benchmark||product)&&req.url.match(/^\/matte-fixture\/(0|37|111|12|64)\/(image|mask)$/);if(match){const index=Number(match[1]);if(!benchmarkRows.has(index)){const response=await fetch("https://datasets-server.huggingface.co/rows?dataset="+(product?"finegrain%2Ffinegrain-product-masks-lite&config=default&split=test":"nobg%2FP3M-10K&config=default&split=P3M_500_P")+"&offset="+index+"&length=1",{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error("Dataset rows HTTP "+response.status);const data=await response.json();const row=data.rows?.[0];if(row?.row_idx!==index||!row.row?.image?.src||!row.row?.mask?.src)throw Error("Dataset schema mismatch");benchmarkRows.set(index,row.row);}const url=new URL(benchmarkRows.get(index)[match[2]].src);if(url.protocol!=="https:"||!(url.hostname==="huggingface.co"||url.hostname.endsWith(".huggingface.co")||url.hostname==="hf.co"||url.hostname.endsWith(".hf.co")))throw Error("Unexpected dataset asset host");const asset=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!asset.ok)throw Error("Dataset asset HTTP "+asset.status);const bytes=Buffer.from(await asset.arrayBuffer());if(!bytes.length||bytes.length>16*1024*1024)throw Error("Dataset asset size");res.writeHead(200,{"Content-Type":asset.headers.get("content-type")||"application/octet-stream"});res.end(bytes);return;}if(real&&req.url==="/vision-portrait.jpg"){const sample=await fetch("https://storage.googleapis.com/mediapipe-assets/portrait.jpg",{signal:AbortSignal.timeout(15000)});if(!sample.ok)throw Error("Portrait HTTP "+sample.status);const bytes=Buffer.from(await sample.arrayBuffer());if(!bytes.length||bytes.length>8*1024*1024)throw Error("Invalid portrait sample");res.writeHead(200,{"Content-Type":"image/jpeg"});res.end(bytes);return;}const pathname=new URL(req.url,"http://localhost").pathname;const local=pilotConfigured?pathname.replace(/^\/fixture@[a-f0-9]{40}\//,"/"):pathname;const path=resolve(root,"."+local);if(!path.startsWith(root+sep)||!types[extname(path)]){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":types[extname(path)]});res.end(await readFile(!real&&path===resolve(root,"src/core/vision.js")?resolve(root,"tests/browser/vision-fixture.js"):!real&&path===resolve(root,"src/core/portrait-engine.js")?resolve(root,"tests/browser/portrait-fixture.js"):path));}catch(e){console.warn("FIXTURE_FETCH_FAILED",String(e.message).slice(0,200));if(!res.headersSent)res.writeHead(502);res.end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
if(pilot){
 const {buildPilotShell}=await import("../../prototypes/studio-licensing/build-pilot-shell.mjs");
 pilotHTML=buildPilotShell(await readFile(resolve(root,"canvas/shell.html"),"utf8"),{apiUrl:pilotConfigured?fixtureEndpoint:""});
 // Test-only substitution: immutable module paths map to local checkout; no real endpoint.
 if(pilotConfigured)pilotHTML=pilotHTML.replace('const CDN = "https://cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper";','const CDN = "http://127.0.0.1:'+server.address().port+'/fixture";');
 if(pilotMinified){const {minifyShell,loadMinifier}=await import("../../prototypes/studio-licensing/minify-shell.mjs");pilotHTML=await minifyShell(pilotHTML,loadMinifier());}
}
const browser=spawn(process.env.CHROME_BIN||"google-chrome",["--headless=new","--no-sandbox","--disable-dev-shm-usage",...(real?["--use-angle=swiftshader","--enable-unsafe-swiftshader"]:["--disable-gpu"]),"--no-first-run","--remote-debugging-port=0","--user-data-dir="+dir,"about:blank"],{stdio:["ignore","ignore","pipe"]});
let ws, spawnError, stderr="";browser.on("error",e=>{spawnError=e});browser.stderr?.on("data",b=>{stderr=(stderr+String(b)).slice(-3000);});
try{
 let port;
 for(let i=0;i<300;i++){if(spawnError)throw spawnError;if(browser.exitCode!==null)throw Error("Chromium exited "+browser.exitCode+": "+stderr);try{port=(await readFile(resolve(dir,"DevToolsActivePort"),"utf8")).split("\n")[0];break;}catch{await delay(100);}}
 if(!port)throw Error("Chromium failed to start: "+stderr);
 const pages=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();const page=pages.find(p=>p.type==="page");if(!page)throw Error("No Chromium page");
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
 let seq=0;const pending=new Map(),requests=[],networkEvents=[],requestById=new Map(),loaderEvents=[];
 const safeUrl=value=>{try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"?u.origin+u.pathname:u.protocol;}catch{return "invalid-url";}};
 ws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.method==="Network.requestWillBeSent"){const p=m.params;requests.push(p.request.url);if(liveLoader)requestById.set(p.requestId,safeUrl(p.request.url));}if(liveLoader&&m.method==="Network.responseReceived"){const p=m.params;networkEvents.push({url:safeUrl(p.response.url),status:p.response.status});}if(liveLoader&&m.method==="Network.loadingFailed"){const p=m.params;networkEvents.push({url:requestById.get(p.requestId)||"unknown",error:p.errorText,blocked:p.blockedReason,cors:p.corsErrorStatus?.corsError});}if(liveLoader&&m.method==="Runtime.consoleAPICalled"){const args=m.params.args.map(x=>x.value);if(args[0]==="LINGGAU_LOADER"||args[0]==="LINGGAU_LOADER_READY")loaderEvents.push(args.slice(0,4).map(x=>typeof x==="string"?x.slice(0,100):null));}if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 if(liveLoader||license||pilot){await cdp("Network.enable");await cdp("Runtime.enable");}
 await cdp("Emulation.setDeviceMetricsOverride",product?{width:1200,height:1100,deviceScaleFactor:1,mobile:false}:{width:360,height:800,deviceScaleFactor:1,mobile:true});
 if(pilotConfigured)await cdp("Page.addScriptToEvaluateOnNewDocument",{source:`(()=>{const f=window.fetch.bind(window);window.__fixtureActions=[];let token="b".repeat(64),expiry=0;window.fetch=async(url,opt)=>{if(url!==${JSON.stringify(fixtureEndpoint)})return f(url,opt);const q=JSON.parse(opt.body);window.__fixtureActions.push(q.action);let data={ok:false,error:{code:"UNAUTHORIZED"}};if(q.action==="studioExchangeGrant"&&q.token===""&&q.payload.code==="a".repeat(64)){expiry=Date.now()+60000;data={ok:true,data:{token,expires_at:expiry}};}if(q.action==="studioValidateSession"&&q.token===token)data={ok:true,data:{active:true,member_id:"M-9001",expires_at:expiry}};if(q.action==="studioLogout"&&q.token===token)data={ok:true,data:{success:true}};return {ok:true,url,text:async()=>JSON.stringify(data)};};})()`});
 await cdp("Page.navigate",{url:"http://127.0.0.1:"+server.address().port+(liveLoader?"/canvas/shell.html":license?"/tests/browser/studio-license.html":pilot?"/pilot-shell.html":product?"/tests/browser/product-benchmark.html"+(dailyProduct?"?daily=1":process.argv.includes("--birefnet-pilot")?"?pilot=1":""):benchmark?"/tests/browser/matte-benchmark.html":real?"/tests/browser/real-vision.html":"/tests/browser/smoke.html")});
 let result;
 for(let i=0;i<(real?3000:liveLoader?700:240);i++){await delay(100);try{const expression=pilotDisabled?`(()=>{const a=document.querySelector("#app [role=alert]");return a?{ok:a.textContent.includes("belum dikonfigurasi")&&!document.querySelector("#studio")&&!document.querySelector("#studio-grant"),detail:"default OFF, no login or workspace"}:null;})()`:pilotConfigured?`(()=>{const input=document.querySelector("#studio-grant");if(!input)return null;const stage=window.__pilotTestStage||0;if(stage===0){if(document.querySelector("#studio")||window.__fixtureActions.length)return {ok:false,detail:"premature workspace"};window.__pilotTestStage=1;input.value="a".repeat(64);input.form.requestSubmit();return null;}if(stage===1){const app=document.querySelector("#studio");if(!app)return null;if(window.__fixtureActions.slice(0,2).join(",")!=="studioExchangeGrant,studioValidateSession"||!app.querySelector(".brand")?.textContent.includes("4d9be8d"))return {ok:false,detail:"mount contract"};window.__pilotTestStage=2;[...document.querySelectorAll("button")].find(b=>b.textContent==="Keluar").click();return null;}if(document.querySelector("#studio")||input.disabled)return null;return {ok:window.__fixtureActions.includes("studioLogout")&&localStorage.length===0&&sessionStorage.length===0&&document.documentElement.scrollWidth<=innerWidth+1,detail:"configured synthetic transport; exact app revision; login/validate/mount/logout; no persistence"};})()`:liveLoader?`(()=>{const app=document.getElementById("app"),brand=document.querySelector("#studio .brand"),rail=document.querySelector("#studio .mobile-rail");if(app?.getAttribute("aria-busy")==="false"&&!brand)return {ok:false,detail:app.innerText.slice(0,400)};if(!brand||!rail||getComputedStyle(rail).overflowX!=="auto")return null;const rev=${JSON.stringify(expectedPreview)},good=JSON.parse(localStorage.getItem("linggau-loader-v2:lkg:preview")||"null");return {ok:brand.textContent.includes(rev.slice(0,7))&&good?.commit===rev&&document.documentElement.scrollWidth<=innerWidth+1,detail:"revision="+brand.textContent+" LKG="+good?.commit+" viewport="+innerWidth+" scrollWidth="+document.documentElement.scrollWidth};})()`:"window.__smoke";const r=await cdp("Runtime.evaluate",{expression,returnByValue:true});result=r.result?.value;if(result)break;}catch{}}
 if(liveLoader){
  const pointer="https://cuan74468-ux.github.io/linggau-ai-wrapper/channel.json",entry="https://cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper@"+expectedPreview+"/src/app.js";
  const forbidden=requests.filter(u=>u.includes("generativelanguage.googleapis.com")||u.includes("raw.githubusercontent.com")||u.includes("cdn.jsdelivr.net/gh/cuan74468-ux/linggau-ai-wrapper@main/"));
  if(!requests.includes(pointer)||!requests.includes(entry)||forbidden.length||!result?.ok){console.error("LIVE_LOADER_DIAGNOSTIC",JSON.stringify({pointerRequested:requests.includes(pointer),entryRequested:requests.includes(entry),forbidden:forbidden.map(safeUrl),result,loaderEvents,network:networkEvents.slice(-80)}));}
  if(!requests.includes(pointer)||!requests.includes(entry)||forbidden.length)throw Error("LIVE_LOADER_NETWORK_CONTRACT");
 }
 if((license||pilot)&&requests.some(u=>/^https?:/.test(u)&&!u.startsWith("http://127.0.0.1:"+server.address().port+"/")))throw Error("LICENSE_UNEXPECTED_EXTERNAL_NETWORK");
 if(pilotDisabled&&requests.some(u=>u.includes("/fixture@")||u.includes("/src/app.js")))throw Error("PILOT_DISABLED_IMPORTED_APP");
 if(pilotConfigured&&!requests.some(u=>u.includes("/fixture@4d9be8d4430c9427445ee0271262ef8093e60c7b/src/app.js")))throw Error("PILOT_PINNED_APP_NOT_REQUESTED");
 if(product){
  try{
   await mkdir(resolve(root,"qa-artifacts"),{recursive:true});
   const shot=await cdp("Page.captureScreenshot",{format:"png",captureBeyondViewport:true});
   await writeFile(resolve(root,"qa-artifacts/product-visual.png"),Buffer.from(shot.data,"base64"));
   await writeFile(resolve(root,"qa-artifacts/product-metrics.txt"),result?.detail||"Browser smoke timed out");
  }catch(e){console.warn("PRODUCT_EVIDENCE_FAILED",String(e.message).slice(0,200));}
 }
 if(!result?.ok)throw Error(result?.detail||"Browser smoke timed out");
 console.log((liveLoader?"LIVE_LOADER_PASS: ":license?"STUDIO_LICENSE_BROWSER_PASS: ":pilot?"STUDIO_PILOT_SHELL_BROWSER_PASS: ":dailyProduct?"DAILY_PRODUCT_PASS: ":product?"PRODUCT_BENCHMARK_COMPLETE: ":benchmark?"MATTE_BENCHMARK_PASS: ":real?"REAL_VISION_PASS: ":"BROWSER_SMOKE_PASS: ")+result.detail);
}finally{ws?.close();browser.kill("SIGKILL");server.close();await delay(200);await rm(dir,{recursive:true,force:true}).catch(()=>{});}
