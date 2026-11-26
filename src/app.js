import { findFeatures, getFeature, CATEGORIES } from "./core/feature-registry.js";
import { createAIClient, friendlyError } from "./core/ai-client.js";
import { createAssetStore } from "./core/assets.js";
import { readImage, decodeImage } from "./core/images.js";
import {assessOutput} from "./core/quality.js";
import {supportsPrecision,backdropPlan,sharpenLocal,prepareCutout,composeCutout} from "./core/local-image.js";
import {validPolygon,validateDimensions} from "./core/pixels.js";
import {processingRoute,primaryFieldIds} from "./core/processing-router.js";
import {validateMask,brushMask} from "./core/vision-mask.js";
import {refineMask,findObjectSeed} from "./core/mask-refinement.js";
import {needsReferenceReview,createReferenceReview} from "./core/reference-review.js";
import {validatePresets,applyPreset} from "./core/presets.js";
import {createChatSession,CHAT_MAX_INPUT} from "./core/chat.js";

function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls){const n=el("button",text,cls);n.type="button";n.addEventListener("click",fn);return n;}
function image(asset){const n=el("img");n.alt="Aset visual";n.src="data:"+asset.mimeType+";base64,"+asset.base64;return n;}
function download(asset){const a=el("a");const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[asset.mimeType];const blob=new Blob([Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0))],{type:asset.mimeType});const url=URL.createObjectURL(blob);a.href=url;a.download="linggau-"+asset.id+"."+ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
// Canvas may block Clipboard API. Fall back to selection and explicit manual copy.
export async function copyResult(field, {nav=globalThis.navigator, doc=globalThis.document}={}){
  const select=()=>{field.focus();field.select();field.setSelectionRange(0,field.value.length);};
  // Select synchronously while the click still has user activation.
  select();
  try{
    if(typeof nav?.clipboard?.writeText==="function"){
      await nav.clipboard.writeText(field.value);
      return "clipboard";
    }
  }catch{/* Permission denied: try legacy copy, otherwise leave text selected. */}
  try{
    select();
    if(typeof doc?.execCommand==="function"&&doc.execCommand("copy"))return "legacy";
  }catch{/* Some sandboxed frames deny both copy paths. */}
  select();
  return "manual";
}
function downloadText(asset){
  const url=URL.createObjectURL(new Blob([asset.text],{type:"text/plain;charset=utf-8"}));
  const a=el("a");a.href=url;a.download="linggau-"+asset.id+".txt";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function mount({root,ai,version,revision="",signal}){
  if(!(root instanceof HTMLElement))throw new Error("APP_ROOT_INVALID");
  const client=createAIClient(ai), store=createAssetStore(), conversation=createChatSession();
  const css=el("link");css.rel="stylesheet";css.href=new URL("./styles/studio.css",import.meta.url).href;
  const studio=el("section");studio.id="studio";
  const top=el("header",null,"top");
  const brand=el("div",null,"brand");
  const mark=el("img",null,"brandmark");mark.alt="";mark.src=new URL("./assets/linggau-mark.svg",import.meta.url).href;brand.append(mark);
  const identity=el("div");identity.append(el("strong","Linggau AI Studio"),el("small","Workspace kreatif · v"+version+(revision?" · "+revision.slice(0,7):"")));brand.append(identity);
  const ready=el("small",client.available().imageToImage?"Siap digunakan":"Sebagian fitur memerlukan koneksi AI","bridge-status");
  top.append(brand,ready);
  const sidebar=el("aside",null,"sidebar");sidebar.id="studio-sidebar";
  const nav=el("nav",null,"nav");nav.setAttribute("aria-label","Seluruh alat AI");
  const view=el("div",null,"workspace");view.id="studio-workspace";view.setAttribute("role","region");view.setAttribute("aria-label","Area kerja");view.tabIndex=-1;
  const global=el("p",null,"status");global.setAttribute("role","status");global.hidden=true;
  const work=el("div",null,"work");work.append(global,view);
  const frame=el("div",null,"frame");sidebar.append(nav);frame.append(sidebar,work);
  const mobileBar=el("nav",null,"mobile-bar");mobileBar.setAttribute("aria-label","Navigasi alat AI di HP");
  const mobileRail=el("div",null,"mobile-rail");mobileRail.setAttribute("aria-label","Geser mendatar untuk memilih alat");
  mobileBar.append(mobileRail);
  studio.append(top,frame,mobileBar);root.replaceChildren(css,studio);
  let active=false, disposed=false, viewEpoch=0, current=null, slots=[], result=null, page="home",activeCategory="all";
  const tell=t=>{global.textContent=t;global.hidden=!t;};
  const compact=window.matchMedia("(max-width: 700px)");
  function setNav(){for(const b of studio.querySelectorAll(".nav button, .nav input, .mobile-bar button"))b.disabled=active;}
  function change(fn){if(active||disposed)return;++viewEpoch;tell("");fn();renderNavigation();view.focus({preventScroll:true});view.scrollIntoView({block:"start"});if(compact.matches){const selected=mobileRail.querySelector("[aria-current=page]");if(selected){const r=mobileRail.getBoundingClientRect(),s=selected.getBoundingClientRect();if(s.left<r.left||s.right>r.right)mobileRail.scrollLeft+=s.left-r.left-(r.width-s.width)/2;}}}
  const home=button("Asisten AI",()=>change(chatHome),"nav-main");
  const recent=button("Aset sesi",()=>change(history),"nav-main");
  const clear=button("Bersihkan sesi",()=>{if(active||!window.confirm("Hapus semua aset, percakapan dan input sesi?"))return;change(()=>{store.clear();conversation.clear();slots=[];result=null;current=null;chatHome();tell("Sesi dibersihkan.");});},"nav-main");
  const sideSearch=el("input");sideSearch.type="search";sideSearch.placeholder="Cari alat AI…";sideSearch.setAttribute("aria-label","Cari alat di sidebar");
  const groups=el("div",null,"nav-groups");
  const opened=new Set([CATEGORIES[0]]);
  nav.append(home,recent,sideSearch,groups,clear);
  const mobileButtons=new Map();
  const categoryNames=["Foto","Editor","Desain","Bisnis","Edukasi","Media","Kreatif"];
  function mobileItem(id,label,full,action){const b=button(label,()=>change(action),"mobile-item");b.setAttribute("aria-label",full);b.title=full;mobileButtons.set(id,b);mobileRail.append(b);}
  mobileItem("home","Asisten","Asisten AI",chatHome);
  mobileItem("search","Cari","Cari alat",()=>categoryView("all"));
  for(const [i,cat] of CATEGORIES.entries())mobileItem(cat,categoryNames[i]||cat,cat,()=>categoryView(cat));
  mobileItem("history","Hasil","Aset sesi",history);
  function categoryView(cat){
    page="category";current=null;slots=[];result=null;activeCategory=cat;
    const h=el("h1",cat==="all"?"Cari alat":cat),search=el("input");search.type="search";search.placeholder="Cari alat…";search.setAttribute("aria-label","Cari alat");
    const items=el("div",null,"category-tools");view.replaceChildren(h,search,items);
    const draw=()=>{items.replaceChildren();const matches=findFeatures(search.value,cat);for(const f of matches){const card=button("",()=>change(()=>workspace(f)),"category-tool");card.dataset.tool=f.id;card.append(el("strong",f.title),el("small",f.description));items.append(card);}if(!matches.length)items.append(el("p","Alat tidak ditemukan.","empty"));};
    search.addEventListener("input",draw);draw();
  }
  sideSearch.addEventListener("input",renderNavigation);
  function renderNavigation(){
    home.setAttribute("aria-current",page==="home"?"page":"false");
    recent.setAttribute("aria-current",page==="history"?"page":"false");
    recent.textContent="Aset sesi ("+store.list().length+")";
    for(const [id,b] of mobileButtons)b.setAttribute("aria-current",id===(page==="tool"?current?.category:page==="category"?(activeCategory==="all"?"search":activeCategory):page)?"page":"false");
    mobileButtons.get("history").textContent="Hasil ("+store.list().length+")";
    groups.replaceChildren();
    const matches=findFeatures(sideSearch.value);
    for(const cat of CATEGORIES){
      const tools=matches.filter(f=>f.category===cat);if(!tools.length)continue;
      const details=el("details",null,"nav-category");details.open=!!sideSearch.value.trim()||opened.has(cat)||tools.some(f=>f.id===current?.id);
      const summary=el("summary",cat);details.append(summary);
      details.addEventListener("toggle",()=>{if(!sideSearch.value.trim()){if(details.open)opened.add(cat);else opened.delete(cat);}});
      for(const f of tools){const item=button(f.title,()=>change(()=>workspace(f)),"nav-tool");item.setAttribute("aria-current",current?.id===f.id?"page":"false");details.append(item);}
      groups.append(details);
    }
    if(!matches.length)groups.append(el("p","Alat tidak ditemukan.","empty"));
    setNav();
  }
  function chatHome(){
    page="home";current=null;slots=[];result=null;
    const panel=el("section",null,"chat-home"), intro=el("div",null,"chat-intro");
    const big=el("img",null,"chat-logo");big.src=mark.src;big.alt="";
    intro.append(big,el("h1","Apa yang ingin Anda kerjakan?"),el("p","Tanya, belajar, menulis, merencanakan, atau menyelesaikan pekerjaan sehari-hari."));
    const bar=el("div",null,"chat-bar");const fresh=button("＋ Chat baru",()=>{if(active)return;if(conversation.list().length&&!window.confirm("Hapus percakapan sesi ini?"))return;conversation.clear();chatHome();},"chat-new");bar.append(el("strong","Asisten AI"),fresh);
    const messages=el("div",null,"chat-messages");messages.setAttribute("role","log");messages.setAttribute("aria-label","Percakapan");messages.setAttribute("aria-live","polite");
    const form=el("form",null,"chat-composer");const field=el("textarea");field.rows=3;field.maxLength=CHAT_MAX_INPUT;field.placeholder="Tulis pertanyaan atau pekerjaan Anda…";field.setAttribute("aria-label","Pesan untuk asisten AI");
    const status=el("p",null,"chat-status");status.setAttribute("role","status");
    const send=el("button","Kirim ↑","primary");send.type="submit";
    const foot=el("div",null,"chat-compose-actions");foot.append(el("small","Enter untuk baris baru"),send);
    const info=el("details",null,"chat-info");info.append(el("summary","Tentang asisten & privasi"),el("p","Percakapan tersimpan sementara di halaman ini, bukan di akun Gmail. Asisten memakai konteks terbaru yang muat dalam batas prompt; percakapan lama dapat tidak ikut terkirim. Tidak memiliki akses langsung ke web, Gmail, Drive atau tindakan eksternal. Pesan dikirim ke Gemini saat Anda menekan Kirim. Hindari informasi sensitif."));
    form.append(field,foot,status,info);
    panel.append(bar,intro,messages,form);view.replaceChildren(panel);
    function draw(){
      const turns=conversation.list();intro.hidden=turns.length>0;messages.replaceChildren();
      for(const turn of turns){
        const u=el("article",null,"chat-user");u.append(el("strong","Anda"),el("p",turn.user,"chat-body"));
        const a=el("article",null,"chat-assistant");a.append(el("strong","Linggau AI"),el("p",turn.assistant,"chat-body"));
        const feedback=el("small");feedback.setAttribute("role","status");
        a.append(button("Salin jawaban",async()=>{let tmp=a.querySelector("textarea");if(!tmp){tmp=el("textarea");tmp.value=turn.assistant;tmp.readOnly=true;tmp.setAttribute("aria-label","Jawaban untuk disalin");a.append(tmp);}try{const mode=await copyResult(tmp);feedback.textContent=mode==="manual"?"Teks dipilih. Gunakan menu Salin.":"Teks disalin.";if(mode!=="manual")tmp.remove();}catch{feedback.textContent="Pilih teks secara manual.";}}, "chat-copy"),feedback);
        messages.append(u,a);
      }
    }
    function refreshChat(){send.disabled=active||!field.value.trim()||!client.available().textToText;field.disabled=active;fresh.disabled=active;send.textContent=active?"Memproses…":"Kirim ↑";setNav();}
    field.addEventListener("input",refreshChat);
    form.addEventListener("submit",async e=>{
      e.preventDefault();if(active||!field.value.trim()||!client.available().textToText)return;
      const input=field.value.trim();active=true;status.textContent="Mengirim satu permintaan…";refreshChat();
      try{const res=await client.chat(conversation.prompt(input));if(disposed||signal?.aborted)return;conversation.append(input,res.text);field.value="";draw();status.textContent="";ready.textContent="Siap digunakan";}
      catch(e){status.textContent=friendlyError(e);ready.textContent="Proses belum berhasil";}
      finally{active=false;if(!disposed){refreshChat();if(!compact.matches)field.focus();}}
    });
    draw();refreshChat();
  }
  function reuse(asset){
    if(asset.kind!=="image")return;
    const card=el("div",null,"card");card.append(el("h3","Pakai ulang hasil"));
    for(const f of findFeatures().filter(x=>x.slots.length))for(let i=0;i<f.slots.length;i++)card.append(button(f.title+" · "+f.slots[i],()=>change(()=>workspace(f,asset,i))));
    view.append(card);
  }
  function resultCard(asset,target){
    target.replaceChildren(el("h3","Hasil · "+(getFeature(asset.featureId)?.title||asset.featureId)));
    if(asset.kind==="image"){target.append(image(asset),button("Unduh gambar",()=>download(asset),"primary"));if(asset.width&&asset.height)target.append(el("small",asset.width+" × "+asset.height+" px · "+asset.mimeType));}
    else{
      const field=el("textarea",null,"text-result");field.value=asset.text;field.readOnly=true;field.rows=14;field.setAttribute("aria-label","Teks hasil AI");
      const feedback=el("p",null,"copy-feedback");feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
      const actions=el("div",null,"actions");
      const copyButton=button("Salin teks",async()=>{
        copyButton.disabled=true;
        try{
          const mode=await copyResult(field);
          feedback.textContent=mode==="manual"?"Teks sudah dipilih. Tekan Ctrl+C atau gunakan menu Salin di HP.":"Teks berhasil disalin.";
        }catch{feedback.textContent="Salin otomatis tidak tersedia. Gunakan Pilih semua atau Unduh TXT.";}
        finally{copyButton.disabled=false;}
      },"primary");
      actions.append(copyButton,button("Pilih semua",()=>{field.focus();field.select();field.setSelectionRange(0,field.value.length);feedback.textContent="Teks dipilih. Tekan Ctrl+C atau gunakan menu Salin di HP.";}),
        button("Unduh TXT",()=>{try{downloadText(asset);}catch{feedback.textContent="Unduhan dibatasi browser. Gunakan Pilih semua untuk menyalin teks.";}}));
      target.append(field,actions,feedback);
    }
    const warnings=asset.quality?.checks.filter(c=>c.state==="warn")||[];
    if(warnings.length){
      const notice=el("details",null,"quality-panel result-warning");notice.append(el("summary","Perlu diperiksa ("+warnings.length+")"));
      for(const c of warnings)notice.append(el("p",c.label,"quality-warn"));
      target.append(notice);
    }
    if(asset.kind==="image"){
      const sel=el("select");sel.setAttribute("aria-label","Fitur tujuan");const placeholder=el("option","Pakai ulang ke fitur…");placeholder.value="";sel.append(placeholder);
      for(const f of findFeatures().filter(x=>x.slots.length))f.slots.forEach((s,i)=>{const op=el("option",f.title+" — "+s);op.value=f.id+":"+i;sel.append(op);});
      target.append(sel,button("Pakai ulang",()=>{if(!sel.value)return;const [id,i]=sel.value.split(":");change(()=>workspace(getFeature(id),asset,Number(i)));}));
    }
  }
  function history(){
    page="history";current=null;slots=[];result=null;view.replaceChildren(el("h1","Aset sesi"),el("p","Pakai kembali foto hasil AI pada alat lain atau unduh. Maksimal 10 aset; hilang saat halaman dimuat ulang. Tidak disimpan ke Gmail atau database."));
    const erase=button("Bersihkan sesi",()=>clear.click());view.append(erase);
    const grid=el("div",null,"grid");view.append(grid);
    for(const a of store.list()){const c=el("article",null,"card");resultCard(a,c);c.append(el("small","Asal aset: "+(a.parents.join(", ")||"input baru")),button("Hapus hasil",()=>change(()=>{store.remove(a.id);history();})));grid.append(c);}
    if(!store.list().length)grid.append(el("p","Belum ada hasil.","empty"));
  }
  function workspace(f,initial=null,initialIndex=0){
    page="tool";current=f;slots=f.slots.map(()=>null);result=null;if(initial)slots[initialIndex]=initial;
    const epoch=viewEpoch;let loading=0;const revisions=f.slots.map(()=>0);const values={};const inputs=[];const radios=new Map();const fieldGroups=new Map();
    const localSharpen=f.id==="sharpen",precisionSupported=supportsPrecision(f.id),primaryIds=primaryFieldIds(f);let precision=precisionSupported,points=[],maskSource=undefined,maskCanvas=null,maskImage=null,maskControls=[],useAlpha=false,transparent=false,alphaAvailable=false,drawMode=false,visionMask=null,visionBusy=false,brushMode=0,shadow=false,subjectKind=["background","formal-photo"].includes(f.id)?"person":"object",autoDetect=null;
    const heading=el("div",null,"tool-heading");const back=button("‹ "+f.category,()=>change(()=>categoryView(f.category)),"tool-back");heading.append(back,el("h1",f.title),el("p",f.description));view.replaceChildren(heading);
    const layout=el("div",null,"layout"), form=el("section",null,"card input-panel"), output=el("section",null,"card output-panel");
    form.id="studio-input";output.id="studio-output";
    const tabs=el("div",null,"workspace-tabs");const editTab=button("Pengaturan",()=>showPane("input"),"pane-tab");const resultTab=button("Hasil",()=>showPane("output"),"pane-tab");
    editTab.setAttribute("aria-controls",form.id);resultTab.setAttribute("aria-controls",output.id);tabs.append(editTab,resultTab);view.append(tabs);
    function showPane(pane){layout.dataset.pane=pane;editTab.setAttribute("aria-pressed",String(pane==="input"));resultTab.setAttribute("aria-pressed",String(pane==="output"));}
    showPane("input");
    form.append(el("h2",f.slots.length?"1. Masukkan foto":"1. Isi kebutuhan Anda"));
    const requiredArea=el("div",null,"required-fields"),mainArea=el("div",null,"main-fields"),advanced=el("details",null,"advanced-settings");advanced.append(el("summary","Pengaturan lanjutan"));if(!f.slots.length)form.append(requiredArea);
    
    const status=el("p","Siap menerima input.","status");status.setAttribute("role","status");
    const blocker=el("p",null,"process-blocker");blocker.setAttribute("role","status");blocker.id="process-blocker";
    const run=button("Proses AI",process,"primary"), retry=button("Coba Lagi",process);retry.hidden=true;run.setAttribute("aria-describedby",blocker.id);
    function refresh(){
      const disabled=active||loading>0||visionBusy;
      let available=client.available()[{"image-to-image":"imageToImage","text-to-image":"textToImage","text-to-text":"textToText"}[f.engine]];
      if(localSharpen)available=true;
      let reason="";
      if(loading>0)reason="Sedang membaca foto…";
      else if(visionBusy)reason="Sedang mendeteksi objek. Tunggu hasil deteksi.";
      else if(slots.some(x=>!x))reason="Unggah foto referensi terlebih dahulu.";
      if(precision){
        available=false;
        if(!reason){
          if(!maskImage)reason="Foto sedang disiapkan.";
          else if(slots[0]?.width*slots[0]?.height>4000000||slots[0]?.width>4096||slots[0]?.height>4096)reason="Foto terlalu besar. Pilih foto maksimal 4 megapiksel.";
          else{try{const route=processingRoute(f,true,{...values,transparent});available=!route.needsAI||client.available().textToImage;if(!available)reason="Mesin pembuat latar tidak tersedia. Pilih putih, beige, atau PNG transparan.";}catch(e){reason=String(e.message).includes("BACKGROUND_UNCHANGED")?"Pilih latar baru atau PNG transparan.":"Periksa pengaturan latar.";} }
        }
      }
      if(!reason&&f.fields.some(p=>p.required&&(!precision||(!transparent&&p.id==="sceneBrief"))&&!String(values[p.id]||"").trim()))reason="Lengkapi kolom wajib.";
      if(!reason&&!available&&!active)reason="Mesin AI belum tersedia.";
      blocker.textContent=active?"":reason;blocker.hidden=!blocker.textContent;
      form.classList.toggle("precision-active",precision);
      run.disabled=disabled||slots.some(x=>!x)||f.fields.some(p=>p.required&&(!precision||(!transparent&&p.id==="sceneBrief"))&&!String(values[p.id]||"").trim())||!available;retry.disabled=run.disabled;
      inputs.forEach(x=>x.disabled=disabled);maskControls.forEach(x=>x.disabled=disabled);
      if(maskCanvas)maskCanvas.style.pointerEvents=disabled?"none":"auto";
      for(const [id,group] of fieldGroups)group.hidden=(precision&&(transparent||!["background","customBackground","sceneBrief"].includes(id)))||(localSharpen&&id==="notes");
      run.textContent=active?"Sedang memproses…":f.engine==="text-to-text"?"Buat teks":"Proses foto";setNav();
    }
    const precisionPanel=el("section",null,"precision-panel");
    const maskArea=el("div",null,"mask-area");const correction=el("details",null,"precision-correction");correction.append(el("summary","Koreksi objek (opsional)"),maskArea);
    if(precisionSupported){
      const modeLabel=el("label","Cara mengedit");modeLabel.htmlFor="precision-mode";
      const mode=el("select");mode.id="precision-mode";for(const [v,t] of [["strict","Pertahankan objek asli"],["ai","Ubah tampilan dengan AI (detail dapat berubah)"]]){const o=el("option",t);o.value=v;mode.append(o);}
      const explanation=el("small","Foto asli dipertahankan pada bagian yang terdeteksi. Pilih latar lalu buat foto.");
      const subjectLabel=el("label","Isi foto");subjectLabel.htmlFor="subject-kind";const subject=el("select");subject.id="subject-kind";for(const [value,label] of [["person","Orang / potret"],["object","Produk / makanan / benda"]]){const opt=el("option",label);opt.value=value;subject.append(opt);}subject.value=subjectKind;subject.addEventListener("change",()=>{subjectKind=subject.value;visionMask=null;points=[];status.textContent="Jenis foto diubah. Deteksi akan dijalankan saat proses.";drawMask();refresh();});inputs.push(subject);
      const transparentLabel=el("label",null,"precision-option"),transparentBox=el("input");transparentBox.type="checkbox";transparentLabel.append(transparentBox,el("span","Hapus latar (PNG transparan)"));transparentBox.addEventListener("change",()=>{transparent=transparentBox.checked;refresh();});inputs.push(transparentBox);
      const shadowLabel=el("label",null,"precision-option"),shadowBox=el("input");shadowBox.type="checkbox";shadowLabel.append(shadowBox,el("span","Tambahkan bayangan di bawah objek"));shadowBox.addEventListener("change",()=>{shadow=shadowBox.checked;refresh();});inputs.push(shadowBox);
      transparentBox.addEventListener("change",()=>{shadowLabel.hidden=transparent;});
      precisionPanel.append(subjectLabel,subject,explanation,transparentLabel);advanced.append(shadowLabel,correction);
      mode.addEventListener("change",()=>{precision=mode.value==="strict";precisionPanel.hidden=!precision;shadowLabel.hidden=!precision||transparent;correction.hidden=!precision;presetPicker.value="";refresh();});
      advanced.prepend(modeLabel,mode);inputs.push(mode);
    }
    function drawMask(){
      if(!maskCanvas||!maskImage)return;const ctx=maskCanvas.getContext("2d");if(!ctx)return;
      const w=maskCanvas.width,h=maskCanvas.height;ctx.clearRect(0,0,w,h);ctx.drawImage(maskImage,0,0,w,h);
      if(visionMask){const overlay=document.createElement("canvas");overlay.width=visionMask.width;overlay.height=visionMask.height;const oc=overlay.getContext("2d"),data=oc.createImageData(overlay.width,overlay.height);for(let i=0;i<visionMask.alpha.length;i++){data.data[i*4]=180;data.data[i*4+1]=240;data.data[i*4+2]=40;data.data[i*4+3]=Math.round(visionMask.alpha[i]*.35);}oc.putImageData(data,0,0);ctx.drawImage(overlay,0,0,w,h);return;}
      if(useAlpha){return;}
      if(points.length){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*w,y*h):ctx.moveTo(x*w,y*h));if(points.length>=3){ctx.closePath();ctx.fillStyle="rgba(200,241,53,.24)";ctx.fill();}ctx.lineWidth=2;ctx.strokeStyle="#c8f135";ctx.stroke();for(const [x,y] of points){ctx.beginPath();ctx.arc(x*w,y*h,3,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#111827";ctx.stroke();}}
    }
    function syncMask(){
      if(!precisionSupported||maskSource===slots[0])return;
      maskSource=slots[0];autoDetect=null;correction.open=false;points=[];visionMask=null;brushMode=0;useAlpha=false;alphaAvailable=false;drawMode=false;maskImage=null;maskCanvas=null;maskControls=[];maskArea.replaceChildren();
      if(!maskSource){maskArea.append(el("small","Unggah foto untuk menandai objek."));return;}
      const source=maskSource,canvas=el("canvas",null,"mask-canvas"),img=new Image();maskCanvas=canvas;
      canvas.setAttribute("aria-label","Ketuk titik mengelilingi objek yang ingin dipertahankan");
      const count=el("small","Siap deteksi objek");count.setAttribute("role","status");count.setAttribute("aria-live","polite");
      const detect=button("Deteksi objek (AI lokal)",()=>detectAt({x:.5,y:.5}),"primary");
      let pickPoint=false;const pick=button("Pilih titik objek",()=>{if(active||visionBusy)return;pickPoint=true;drawMode=false;setBrush(0);count.textContent="Ketuk bagian tengah objek yang ingin dipertahankan.";});
      const plus=button("Kuas +",()=>setBrush(1)),minus=button("Kuas −",()=>setBrush(-1));plus.hidden=minus.hidden=true;
      function setBrush(m){brushMode=m;canvas.style.touchAction=m?"none":"manipulation";plus.setAttribute("aria-pressed",String(m===1));minus.setAttribute("aria-pressed",String(m===-1));}
      async function detectAt(point,automatic=false){
        if((active&&!automatic)||visionBusy||!maskImage||epoch!==viewEpoch)return false;
        visionBusy=true;count.textContent="Memuat model dan mendeteksi objek…";status.textContent="Memisahkan objek dari latar…";refresh();
        try{
          const {segmentObject}=await import("./core/vision.js");
          const input=document.createElement("canvas");input.width=canvas.width;input.height=canvas.height;input.getContext("2d").drawImage(maskImage,0,0,input.width,input.height);
          const inputRGB=input.getContext("2d").getImageData(0,0,input.width,input.height).data;
          const seed=automatic&&subjectKind!=="person"?findObjectSeed(inputRGB,input.width,input.height):null;
          if(automatic&&subjectKind!=="person"&&!seed)throw Error("OBJECT_SEED_UNCERTAIN");
          let m;
          if(subjectKind==="person"){
            const {segmentPortrait}=await import("./core/portrait-engine.js");
            m=await segmentPortrait(input,{onStage:message=>{if(epoch===viewEpoch&&maskSource===source)status.textContent=message;}});
          }else m=await segmentObject(input,seed||point);
          // MediaPipe returns mask at input resolution in the supported browser path.
          // If another resolution is returned, sample the original preview at that size.
          let rgb=inputRGB;if(m.width!==input.width||m.height!==input.height){const scaled=document.createElement("canvas");scaled.width=m.width;scaled.height=m.height;const sc=scaled.getContext("2d");sc.drawImage(input,0,0,m.width,m.height);rgb=sc.getImageData(0,0,m.width,m.height).data;}
          if(subjectKind!=="person")m=refineMask(m,rgb);
          validateMask(m);let selected=0;for(const a of m.alpha)if(a>=128)selected++;if(selected/m.alpha.length<.03)throw Error("MASK_TOO_SMALL");
          if(epoch!==viewEpoch||maskSource!==source)return false;
          visionMask=m;useAlpha=false;points=[];drawMode=false;setBrush(0);update();status.textContent="Objek terdeteksi.";return true;
        }catch(e){
          if(epoch===viewEpoch&&maskSource===source){
            const code=String(e?.message||"");
            const explanation=code.includes("VISION_TIMEOUT")?"Waktu pemuatan model habis.":code.includes("VISION_BUSY")?"Model masih memuat.":code.includes("OBJECT_SEED_UNCERTAIN")?"Objek utama belum dapat dipilih otomatis. Buka koreksi dan ketuk objek satu kali.":code.includes("MASK_CLEANUP_UNCERTAIN")?"Tepi objek belum cukup jelas untuk dibersihkan dengan aman.":code.includes("MASK_TOO_SMALL")?"Bagian yang ditemukan terlalu kecil.":code.includes("VISION_MASK_UNAVAILABLE")?"Alat belum mengembalikan area objek yang bisa digunakan.":code.includes("MASK_AREA_INVALID")?"Objek belum dapat dipisahkan dari latar dengan jelas.":code.includes("PORTRAIT_MASK_INVALID")?"Alat potret belum mengembalikan hasil yang lengkap.":code.includes("MASK_INVALID")?"Data pemisahan objek tidak valid.":code.includes("VISION_LIBRARY_LOAD")?"Alat pemisah objek belum bisa dimuat.":code.includes("VISION_MODEL_LOAD")?"Alat pemisah objek belum siap.":code.includes("VISION_MATTE_FAILED")?"Perapian tepi foto belum berhasil pada perangkat ini.":code.includes("VISION_INFERENCE_FAILED")?"Pemisahan objek gagal pada perangkat ini.":"Deteksi tidak tersedia pada sesi ini.";
            const message=explanation+(visionMask?" Pilihan objek sebelumnya tetap tersedia.":" Coba lagi atau buka koreksi objek.");
            count.textContent=message;status.textContent=message;console.warn("LINGGAU_VISION_FAILED",/^[A-Z][A-Z0-9_]{2,79}$/.test(code)?code:"VISION_UNEXPECTED");advanced.open=true;correction.open=true;
          }
          return false;
        }finally{visionBusy=false;if(epoch===viewEpoch)refresh();}
      }
      autoDetect=()=>detectAt({x:.5,y:.5},true);
      const alphaToggle=button("Pakai transparansi foto",()=>{if(active||!alphaAvailable)return;visionMask=null;pickPoint=false;drawMode=false;setBrush(0);useAlpha=true;points=[];update();});alphaToggle.hidden=true;
      const manualToggle=button("Tandai manual",()=>{if(active)return;visionMask=null;pickPoint=false;drawMode=false;setBrush(0);useAlpha=false;points=[];update();});manualToggle.hidden=true;
      const trace=button("Gambar garis",()=>{if(active)return;drawMode=!drawMode;canvas.style.touchAction=drawMode?"none":"manipulation";trace.textContent=drawMode?"Mode garis aktif":"Gambar garis";trace.setAttribute("aria-pressed",String(drawMode));});trace.setAttribute("aria-pressed","false");
      const update=()=>{count.textContent=visionMask?"Mask terdeteksi · periksa dan koreksi":useAlpha?"Transparansi foto aktif":points.length?points.length+" titik · "+(validPolygon(points)?"siap diproses":"kelilingi seluruh objek"):"Siap deteksi otomatis";alphaToggle.hidden=!alphaAvailable||useAlpha;manualToggle.hidden=!useAlpha&&!visionMask;trace.hidden=useAlpha||!!visionMask;undo.hidden=useAlpha||!!visionMask;reset.hidden=useAlpha||!!visionMask;plus.hidden=minus.hidden=!visionMask;drawMask();refresh();};
      img.onload=()=>{if(epoch!==viewEpoch||maskSource!==source||maskCanvas!==canvas)return;const s=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*s));canvas.height=Math.max(1,Math.round(img.naturalHeight*s));maskImage=img;const context=canvas.getContext("2d");if(context){context.drawImage(img,0,0,canvas.width,canvas.height);try{const d=context.getImageData(0,0,canvas.width,canvas.height).data;let clear=false,opaque=false;for(let i=3;i<d.length;i+=4){if(d[i]===0)clear=true;if(d[i]===255)opaque=true;}alphaAvailable=clear&&opaque;useAlpha=alphaAvailable;}catch{alphaAvailable=false;}}update();};
      img.onerror=()=>{if(maskSource===source)count.textContent="Foto tidak dapat dibuka.";};
      img.src="data:"+source.mimeType+";base64,"+source.base64;
      function position(e){const r=canvas.getBoundingClientRect();if(!canvas.clientWidth||!canvas.clientHeight)return null;return [Math.max(0,Math.min(1,(e.clientX-r.left-canvas.clientLeft)/canvas.clientWidth)),Math.max(0,Math.min(1,(e.clientY-r.top-canvas.clientTop)/canvas.clientHeight))];}
      function addPoint(e){if(active||loading||useAlpha||!maskImage||points.length>=300)return;const p=position(e);if(!p)return;const last=points.at(-1);if(last&&Math.hypot(p[0]-last[0],p[1]-last[1])<.004)return;points.push(p);if(!drawing)update();else drawMask();}
      let drawing=false;
      canvas.addEventListener("click",e=>{if(visionBusy||active)return;if(pickPoint){pickPoint=false;const p=position(e);if(p)detectAt({x:p[0],y:p[1]});return;}if(visionMask){if(!brushMode){const p=position(e);if(p)detectAt({x:p[0],y:p[1]});}return;}if(!drawMode)addPoint(e);});
      canvas.addEventListener("pointerdown",e=>{if(visionMask&&brushMode&&!active&&!visionBusy){e.preventDefault();drawing=true;canvas.setPointerCapture?.(e.pointerId);const p=position(e);if(p){brushMask(visionMask,p[0],p[1],brushMode===1);drawMask();}return;}if(!drawMode||active||useAlpha||visionBusy||pickPoint)return;e.preventDefault();points=[];drawing=true;canvas.setPointerCapture?.(e.pointerId);addPoint(e);});
      canvas.addEventListener("pointermove",e=>{if(drawing&&visionMask&&brushMode){const p=position(e);if(p){brushMask(visionMask,p[0],p[1],brushMode===1);drawMask();}}else if(drawing&&drawMode)addPoint(e);});
      canvas.addEventListener("pointerup",()=>{drawing=false;update();});
      canvas.addEventListener("pointercancel",()=>{if(drawing)points=[];drawing=false;update();});
      const undo=button("Urungkan titik",()=>{if(active)return;useAlpha=false;points.pop();update();}),reset=button("Ulangi tanda",()=>{if(active)return;useAlpha=false;points=[];update();});
      maskControls=[detect,pick,plus,minus,undo,reset,trace,alphaToggle,manualToggle];const actions=el("div",null,"actions");actions.append(detect,pick,plus,minus,manualToggle,alphaToggle,trace,undo,reset);
      maskArea.append(el("small","Gunakan koreksi hanya bila hasil kurang tepat. Untuk penandaan manual, kelilingi seluruh objek, bukan bagian wajah saja."),canvas,count,actions,el("small","Deteksi memuat model MediaPipe dari internet. Foto diproses lokal; pustaka dapat mengirim metrik penggunaan. Tanpa kuota Gemini."));
    }
    f.slots.forEach((name,i)=>{
      const id="photo-"+i, label=el("label",name);label.htmlFor=id;
      const file=el("input");file.type="file";file.accept="image/jpeg,image/png,image/webp";file.id=id;
      const preview=el("div",null,"source-preview"), picker=el("select");picker.setAttribute("aria-label","Gunakan aset sesi untuk "+name);
      const none=el("option","Pilih hasil sesi…");none.value="";picker.append(none);
      for(const a of store.list().filter(x=>x.kind==="image")){const o=el("option",(getFeature(a.featureId)?.title||a.featureId)+" · "+a.id);o.value=a.id;picker.append(o);}
      const drop=el("div",null,"drop-zone");const browse=button("Pilih foto",()=>file.click(),"upload-button");drop.append(el("span","↑","upload-symbol"),browse,el("small","atau seret foto ke sini"));file.className="native-file";file.tabIndex=-1;
      const remove=button("Hapus foto",()=>{if(active||loading)return;++revisions[i];slots[i]=null;file.value="";picker.value="";draw();refresh();},"subtle");
      function draw(){preview.replaceChildren();drop.hidden=!!slots[i];remove.hidden=!slots[i];if(slots[i])preview.append(image(slots[i]),el("small",slots[i].id?"Aset sesi "+slots[i].id:"Foto perangkat"),remove);if(i===0)syncMask();}
      async function acceptPhoto(next){if(active||loading)return;const rev=++revisions[i];slots[i]=null;picker.value="";draw();loading++;refresh();try{const a=await readImage(next);if(epoch===viewEpoch&&rev===revisions[i]){slots[i]=a;status.textContent="Foto valid.";}}catch(e){if(epoch===viewEpoch&&rev===revisions[i]){file.value="";status.textContent=friendlyError(e);}}finally{loading--;if(epoch===viewEpoch){draw();refresh();}}}
      file.addEventListener("change",()=>{if(file.files?.[0])acceptPhoto(file.files[0]);});
      drop.addEventListener("dragover",e=>{e.preventDefault();if(!active&&!loading)drop.classList.add("dragging");});drop.addEventListener("dragleave",()=>drop.classList.remove("dragging"));drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("dragging");if(!active&&!loading&&e.dataTransfer?.files?.[0]){file.value="";acceptPhoto(e.dataTransfer.files[0]);}});
      picker.addEventListener("change",()=>{if(active)return;++revisions[i];slots[i]=store.get(picker.value)||null;file.value="";draw();refresh();});
      const upload=el("div",null,"upload-zone");upload.append(label,file,drop,el("small","JPG, PNG, WebP · maks. 8 MB per foto"));if(f.id==="virtual-try-on")upload.append(el("small",i===0?"Gunakan foto tubuh dengan area pakaian terlihat jelas. Foto wajah saja hanya dapat mengedit pakaian yang terlihat; jangan gunakan untuk try-on seluruh badan.":"Gunakan foto pakaian yang jelas, idealnya tanpa model lain. Hanya pakaian dari foto ini yang ditransfer."));upload.append(picker,preview);if(initial&&initialIndex===i)picker.value=initial.id;inputs.push(file,picker,browse,remove);form.append(upload);draw();
    });
    form.append(el("h2","2. Pilih konsep","section-heading"));
    if(precisionSupported)form.append(precisionPanel);
    if(localSharpen)form.append(el("small","Detail foto diperjelas tanpa menggambar ulang wajah atau objek."));
    const presets=validatePresets(f), presetLabel=el("label","Konsep siap pakai");presetLabel.htmlFor="studio-preset";
    const presetPicker=el("select");presetPicker.id="studio-preset";presetPicker.setAttribute("aria-label","Preset kerja");
    const manual=el("option","Pengaturan standar");manual.value="";presetPicker.append(manual);
    presets.forEach((p,i)=>{const op=el("option",p.label);op.value=String(i);presetPicker.append(op);});
    presetPicker.addEventListener("change",()=>{if(active||!presetPicker.value)return;Object.assign(values,applyPreset(f,values,Number(presetPicker.value)));for(const [id,items] of radios)for(const radio of items)radio.checked=values[id]===radio.value;refresh();});
    const presetGroup=el("div");presetGroup.append(presetLabel,presetPicker);form.append(presetGroup,mainArea);inputs.push(presetPicker);fieldGroups.set("presets",presetGroup);
    for(const field of f.fields){
      const destination=precisionSupported&&["background","customBackground","sceneBrief"].includes(field.id)?mainArea:!f.slots.length&&field.required?requiredArea:primaryIds.has(field.id)?mainArea:advanced;
      const id="param-"+field.id, label=el("label",field.label+(field.required?" *":""));label.htmlFor=id;
      values[field.id]=field.default||"";
      if(field.options){
        const fieldset=el("fieldset",null,"param-group");const legend=el("legend",field.label);fieldset.append(legend);
        const choices=el("div",null,field.id==="ratio"?"choice-grid ratio-grid":"choice-grid");
        field.options.forEach((val,i)=>{
          const choice=el("label",null,"choice");const input=el("input");input.type="radio";input.name=id;input.value=val;input.id=id+"-"+i;input.checked=val===values[field.id];
          const caption=el("span",val==="auto"?"Otomatis":val,"choice-caption");
          if(field.id==="ratio"&&val!=="auto"){const shape=el("span",null,"ratio-shape");const [w,h]=val.split(":").map(Number);shape.style.width=String(22*w/Math.max(w,h))+"px";shape.style.height=String(22*h/Math.max(w,h))+"px";caption.prepend(shape);}
          if(!radios.has(field.id))radios.set(field.id,[]);radios.get(field.id).push(input);
          input.addEventListener("change",()=>{if(input.checked){values[field.id]=input.value;refresh();presetPicker.value="";}});
          choice.append(input,caption);choices.append(choice);inputs.push(input);
        });fieldset.append(choices);fieldGroups.set(field.id,fieldset);destination.append(fieldset);
      }else{
        const input=el("textarea");input.id=id;input.rows=field.required?4:2;input.maxLength=field.max||1200;input.value=values[field.id];input.required=!!field.required;
        input.addEventListener("input",()=>{values[field.id]=input.value;refresh();});inputs.push(input);const group=el("div");group.append(label,input);fieldGroups.set(field.id,group);destination.append(group);
      }
    }
    const info=el("details",null,"tool-info");info.append(el("summary","Privasi & informasi"),el("p",localSharpen?"Foto diproses di browser, tanpa dikirim ke Gemini.":precisionSupported?"Mode presisi memproses foto asli di browser; hanya deskripsi latar yang dikirim ke Gemini jika diperlukan. Mode generatif mengirim foto ke Gemini dan dapat mengubah wajah.":"Input dikirim ke Gemini saat diproses. Preservasi visual adalah upaya model, bukan penguncian piksel."));form.append(advanced,el("h2","3. Buat hasil","section-heading"),info,status,blocker);
    const actions=el("div",null,"actions");actions.append(run,retry);form.append(actions);output.append(el("h2","Hasil kerja"),el("p","Hasil akan muncul di sini setelah pemrosesan selesai.","empty result-placeholder"));layout.append(form,output);view.append(layout);refresh();
    async function process(){
      if(active||loading||visionBusy||run.disabled||slots.some(x=>!x))return;
      let phase="Persiapan";active=true;retry.hidden=true;result=null;output.replaceChildren(el("p","Memproses…","empty"));status.textContent=localSharpen||precision?"Memproses foto…":"Mengirim satu permintaan AI…";refresh();
      try{
        let res;
        const route=processingRoute(f,precision,{...values,transparent});
        if(route.kind==="local-sharpen")res=await sharpenLocal(slots[0],values);
        else if(route.kind==="preserve"){validateDimensions(slots[0].width,slots[0].height);const plan=route.plan;phase="Pemisahan objek";let valid=false;try{valid=visionMask?!!validateMask(visionMask):useAlpha?alphaAvailable:validPolygon(points);}catch{}if(!valid){if(!autoDetect||!await autoDetect()){output.replaceChildren(el("h2","Objek belum terdeteksi"),el("p",status.textContent),el("p","Foto asli tetap aman."));showPane("input");retry.hidden=false;return;}}phase="Menyiapkan foto";status.textContent="Menyiapkan latar dan mempertahankan objek…";const prepared=await prepareCutout(slots[0],points,useAlpha,visionMask);phase="Membuat latar";const generated=route.needsAI?await client.backdrop(plan.prompt):null;phase="Menyimpan foto";res=await composeCutout(prepared,plan,generated,shadow&&!transparent);console.info("LINGGAU_COMPOSITE_OK",res.width,res.height,res.protectedPixels);}
        else {phase="Membuat hasil";res=await client.execute(f,{...values},slots);}
        if(disposed||signal?.aborted||epoch!==viewEpoch)return;
        phase="Memeriksa hasil";let verified=res;if(res.kind==="image"){const dimensions=await decodeImage(res);verified={...res,width:dimensions.width,height:dimensions.height};}
        if(disposed||signal?.aborted||epoch!==viewEpoch)return;
        verified={...verified,quality:assessOutput(f,precision?{...values,ratio:"auto"}:values,verified,slots)};
        const jobSources=[...slots], parents=jobSources.filter(x=>x.id).map(x=>x.id);
        const adjust=()=>{if(active)return;showPane("input");const notes=form.querySelector("#param-notes");if(notes){notes.scrollIntoView({block:"center"});notes.focus();}status.textContent="Sesuaikan pengaturan sebelum memproses ulang.";};
        const finish=accepted=>{
          result=store.add(accepted,f.id,parents);resultCard(result,output);
          if(jobSources.length){const compare=el("details",null,"quality-panel");compare.append(el("summary","Bandingkan foto sumber"));jobSources.forEach((source,i)=>{compare.append(el("small",f.slots[i]),image(source));});output.append(compare);}
          output.append(button("Sesuaikan & buat ulang",adjust));
          status.textContent=(verified.quality.checks.some(c=>c.state==="warn")?"Perlu diperiksa · ":"Selesai · ")+(res.elapsedMs/1000).toFixed(1)+" detik";
          ready.textContent=accepted.processing?"Pemrosesan foto selesai":"Mesin AI · permintaan terakhir berhasil";renderNavigation();
        };
        showPane("output");if(compact.matches)tabs.scrollIntoView({block:"start"});
        if(needsReferenceReview(f)){
          const review=createReferenceReview(f,verified,jobSources);
          output.replaceChildren(el("h2","Periksa hasil"),el("p","Pastikan subjek, wajah (jika ada), dan detail asli tetap sesuai. Hasil belum disimpan."));
          const comparison=el("div",null,"reference-compare");
          const original=el("figure");original.append(el("figcaption","Foto asli"),image(jobSources[0]));
          const candidate=el("figure");candidate.append(el("figcaption",verified.processing?"Hasil edit":"Hasil AI"),image(verified));comparison.append(original,candidate);output.append(comparison);
          if(verified.processing==="precision")output.append(el("small","Periksa apakah seluruh objek asli tetap terlihat, termasuk wajah, rambut dan pakaian. Jika bagian hilang, pilih Tidak sesuai."));
          if(jobSources.length>1){const reference=el("details",null,"quality-panel");reference.append(el("summary","Referensi tambahan"));jobSources.slice(1).forEach((s,i)=>reference.append(el("small",f.slots[i+1]),image(s)));output.append(reference);}
          const warnings=verified.quality.checks.filter(c=>c.state==="warn");
          for(const warning of warnings)output.append(el("small",warning.label,"quality-warn"));
          const actions=el("div",null,"actions");
          actions.append(button("Sesuai, gunakan",()=>{if(active||epoch!==viewEpoch||review.state()!=="pending")return;try{finish(review.accept());}catch(e){output.replaceChildren(el("p",friendlyError(e)));}},"primary"),
          button("Tidak sesuai",()=>{if(active||epoch!==viewEpoch||review.state()!=="pending")return;review.reject();result=null;output.replaceChildren(el("h2","Hasil ditolak"),el("p","Foto sumber tetap utuh. Hasil tidak disimpan atau dipakai ulang."),button("Kembali ke pengaturan",adjust));status.textContent="Hasil ditolak oleh pengguna.";if(precision){visionMask=null;points=[];useAlpha=alphaAvailable;correction.open=true;drawMask();}ready.textContent="Hasil tidak disetujui";}));
          output.append(actions);status.textContent="Menunggu pemeriksaan hasil.";ready.textContent="Periksa hasil";
        }else finish(verified);
      }catch(e){const message=friendlyError(e);const code=String(e?.message||"");console.warn("LINGGAU_PROCESS_FAILED",phase,/^[A-Z][A-Z0-9_]{2,79}$/.test(code)?code:"UNEXPECTED_ERROR");output.replaceChildren(el("p",phase+": "+message,"empty"));status.textContent=phase+": "+message;ready.textContent="Proses belum berhasil";retry.hidden=false;showPane("input");}
      finally{active=false;refresh();}
    }
  }
  chatHome();renderNavigation();
  return {unmount(){if(disposed)return;disposed=true;++viewEpoch;store.clear();conversation.clear();slots=[];result=null;current=null;root.replaceChildren();}};
}
