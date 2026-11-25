import {createServer} from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {spawn} from "node:child_process";
import {tmpdir} from "node:os";
import {resolve,extname,sep} from "node:path";
import {setTimeout as delay} from "node:timers/promises";
const root=process.cwd(), dir=await mkdtemp(resolve(tmpdir(),"studio-smoke-"));
const types={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{try{const path=resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(!path.startsWith(root+sep)||!types[extname(path)]){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":types[extname(path)]});res.end(await readFile(path));}catch{res.end();}});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=spawn(process.env.CHROME_BIN||"google-chrome",["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-first-run","--remote-debugging-port=0","--user-data-dir="+dir,"about:blank"],{stdio:"ignore"});
let ws, spawnError;browser.on("error",e=>{spawnError=e});
try{
 let port;
 for(let i=0;i<100;i++){if(spawnError)throw spawnError;try{port=(await readFile(resolve(dir,"DevToolsActivePort"),"utf8")).split("\n")[0];break;}catch{await delay(100);}}
 if(!port)throw Error("Chromium failed to start");
 const pages=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();const page=pages.find(p=>p.type==="page");if(!page)throw Error("No Chromium page");
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
 let seq=0;const pending=new Map();ws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);}});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 await cdp("Emulation.setDeviceMetricsOverride",{width:360,height:800,deviceScaleFactor:1,mobile:true});
 await cdp("Page.navigate",{url:"http://127.0.0.1:"+server.address().port+"/tests/browser/smoke.html"});
 let result;
 for(let i=0;i<240;i++){await delay(100);try{const r=await cdp("Runtime.evaluate",{expression:"window.__smoke",returnByValue:true});result=r.result?.value;if(result)break;}catch{}}
 if(!result?.ok)throw Error(result?.detail||"Browser smoke timed out");
 console.log("BROWSER_SMOKE_PASS: "+result.detail);
}finally{ws?.close();browser.kill("SIGKILL");server.close();await delay(200);await rm(dir,{recursive:true,force:true}).catch(()=>{});}
