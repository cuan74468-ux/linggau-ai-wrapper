// Candidate-only shell build. No default endpoint, no live Canvas changes.
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {Script} from "node:vm";
export const LICENSE_REF="49a7943d6f1a107790f07e8d0c132496e751bc30";
export const APP_REF="4d9be8d4430c9427445ee0271262ef8093e60c7b";
const API=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
function replaceOnce(source,from,to){if(source.split(from).length!==2)throw Error("PILOT_SOURCE_DRIFT");return source.replace(from,to);}
export function buildPilotShell(original,{apiUrl=""}={}){
 if(typeof original!=="string"||typeof apiUrl!=="string"||(apiUrl&&!API.test(apiUrl)))throw Error("PILOT_CONFIG_INVALID");
 const marker="// Loader v2.1:",end="</script>";
 if(original.split(marker).length!==2||original.split(end).length!==2)throw Error("PILOT_SOURCE_DRIFT");
 let prefix=original.slice(0,original.indexOf(marker));
 prefix=replaceOnce(prefix,'const PREVIEW_REF = ""; // Optional immutable SHA override for debugging.\nconst UPDATE_CHANNEL = "preview"; // preview or stable; change only during initial migration.\n',"");
 prefix=replaceOnce(prefix,'let stage = "INIT";\n',"");
 prefix=replaceOnce(prefix,'if(inFlight)throw Error("AI_BUSY");','if(!lifecycle||lifecycle.signal.aborted)throw Error("AI_CANCELLED");\n  if(inFlight)throw Error("AI_BUSY");');
 prefix=replaceOnce(prefix,'const json=await response.json();','const json=await response.json();\n    if(controller.signal.aborted)throw Error("AI_CANCELLED");');
 prefix=replaceOnce(prefix,"</style>",' #app>section:not([hidden]){min-width:0} #app>section:first-child{box-sizing:border-box;max-width:460px;margin:24px auto;padding:20px} #app>section:first-child form{display:grid;gap:10px;margin:16px 0} #app>section:first-child input{font:inherit;box-sizing:border-box;width:100%;min-height:44px} #app>section[hidden]{display:none!important} #app>section>header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;box-sizing:border-box}</style>');
 const suffix=`
const LICENSE_REF = "${LICENSE_REF}";
const APP_REF = "${APP_REF}";
const LICENSE_API = ${JSON.stringify(apiUrl)};
let loginHandle=null,pageClosed=false;
function pilotLocked(root,message){
 root.setAttribute("aria-busy","false");
 const panel=document.createElement("section"),h=document.createElement("h1"),p=document.createElement("p");
 h.textContent="Linggau AI Studio — Pilot";p.setAttribute("role","alert");p.textContent=message;panel.append(h,p);root.replaceChildren(panel);
}
function pilotDeadline(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("PILOT_IMPORT_TIMEOUT")),ms);})]).finally(()=>clearTimeout(timer));}
async function pilotBoot(){
 const root=document.getElementById("app");
 // No API configuration: do not import any runtime or expose a login form.
 if(!LICENSE_API){pilotLocked(root,"Akses pilot belum dikonfigurasi. Hubungi pengelola.");return;}
 try{
  const base=CDN+"@"+LICENSE_REF+"/prototypes/studio-licensing/";
  const [transport,ui]=await pilotDeadline(Promise.all([import(base+"client.mjs"),import(base+"login-ui.mjs")]),20000);
  if(pageClosed)return;
  const client=transport.createStudioLicenseClient({apiUrl:LICENSE_API});
  loginHandle=ui.mountStudioLogin({root,client,mount:async ({root:workspace,signal})=>{
   if(signal.aborted||pageClosed)throw Error("MOUNT_CANCELLED");
   // Application module is imported only AFTER exchange and validation.
   const app=await pilotDeadline(import(CDN+"@"+APP_REF+"/src/app.js"),20000);
   if(signal.aborted||pageClosed||typeof app.mount!=="function")throw Error("MOUNT_CANCELLED");
   const own={signal};lifecycle=own;
   try{
    const handle=await app.mount({root:workspace,ai:aiBridge,version:"0.3.0",revision:APP_REF,signal});
    if(!handle||typeof handle.unmount!=="function")throw Error("MOUNT_HANDLE_REQUIRED");
    if(signal.aborted||pageClosed){handle.unmount();throw Error("MOUNT_CANCELLED");}
    return {unmount(){try{handle.unmount();}finally{if(lifecycle===own)lifecycle=null;}}};
   }catch(e){if(lifecycle===own)lifecycle=null;throw e;}
  }});
  root.setAttribute("aria-busy","false");
 }catch{if(!pageClosed)pilotLocked(root,"Akses pilot belum dapat diverifikasi. Muat ulang atau hubungi pengelola.");}
}
window.addEventListener("pagehide",()=>{pageClosed=true;loginHandle?.unmount();loginHandle=null;lifecycle=null;});
window.addEventListener("pageshow",e=>{if(e.persisted)location.reload();});
pilotBoot();
`;
 const output=prefix+suffix+original.slice(original.indexOf(end));
 const scripts=[...output.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 if(scripts.length!==1||!scripts[0][1].trimStart().startsWith('const apiKey = "";'))throw Error("PILOT_SCRIPT_INVALID");
 new Script(scripts[0][1]);return output;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output||resolve(input)===resolve(output))throw Error("Separate candidate input and output required");
 // CLI intentionally generates unconfigured artifact only.
 await writeFile(output,buildPilotShell(await readFile(input,"utf8")),{flag:"wx"});
 console.log("STUDIO_PILOT_SHELL_BUILD_PASS DEFAULT_OFF_NOT_DEPLOYED");
}
