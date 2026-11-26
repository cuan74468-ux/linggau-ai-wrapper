import {createStudioGate} from "./gate.mjs";
const PORTAL="https://cuan74468-ux.github.io/ngulik-digital-member/staging/member.html#login";
// Isolated component. Host must supply real licensed client and trusted mount.
export function mountStudioLogin({root,client,mount,pollMs=60000}){
 const doc=root.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const panel=el("section"),h=el("h1","Linggau AI Studio"),intro=el("p","Masuk melalui akun Ngulik Digital yang memiliki akses Studio.");
 const link=el("a","Buka Ngulik Digital");link.href=PORTAL;link.target="_blank";link.rel="noopener noreferrer";
 const form=el("form"),label=el("label","Kode akses sekali pakai"),input=el("input");input.id="studio-grant";label.htmlFor=input.id;input.type="password";input.autocomplete="off";input.spellcheck=false;input.required=true;input.maxLength=64;input.pattern="[a-f0-9]{64}";
 const button=el("button","Masuk ke Studio");button.type="submit";const status=el("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 form.append(label,input,button);panel.append(h,intro,link,form,status);
 const workspace=el("section"),bar=el("header"),identity=el("span"),logout=el("button","Keluar");logout.type="button";bar.append(identity,logout);workspace.append(bar);
 const area=el("div");workspace.append(area);root.replaceChildren(panel,workspace);
 let gate;
 gate=createStudioGate({client,pollMs,mount:async ctx=>{
  // Mount into detached container; late completion cannot attach after abort.
  const stage=el("div");const handle=await mount({...ctx,root:stage});
  if(!ctx.signal.aborted)area.replaceChildren(stage);
  return handle;
 },onState:s=>{
  const active=s.phase==="active";panel.hidden=active||s.phase==="closed";workspace.hidden=!active;
  button.disabled=s.phase==="pending";input.disabled=button.disabled;logout.disabled=!active;
  status.textContent=s.message;identity.textContent=active?"Member "+s.member_id:"";
  if(!active)area.replaceChildren();
 }});
 form.addEventListener("submit",e=>{e.preventDefault();const code=input.value.trim();input.value="";void gate.signIn(code);});
 logout.addEventListener("click",()=>void gate.signOut());
 return {unmount(){gate.dispose();root.replaceChildren();}};
}
