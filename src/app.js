import { findFeatures, getFeature, CATEGORIES } from "./core/feature-registry.js";
import { createAIClient, friendlyError } from "./core/ai-client.js";
import { createAssetStore } from "./core/assets.js";
import { readImage, decodeImage } from "./core/images.js";
import {assessOutput} from "./core/quality.js";
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
export async function mount({root,ai,version,revision=""}){
  if(!(root instanceof HTMLElement))throw new Error("APP_ROOT_INVALID");
  const client=createAIClient(ai), store=createAssetStore(), conversation=createChatSession();
  const css=el("link");css.rel="stylesheet";css.href=new URL("./styles/studio.css",import.meta.url).href;
  const studio=el("section");studio.id="studio";
  const top=el("header",null,"top");
  const brand=el("div",null,"brand");
  const mark=el("img",null,"brandmark");mark.alt="";mark.src=new URL("./assets/linggau-mark.svg",import.meta.url).href;brand.append(mark);
  const identity=el("div");identity.append(el("strong","Linggau AI Studio"),el("small","Workspace kreatif · v"+version+(revision?" · "+revision.slice(0,7):"")));brand.append(identity);
  const ready=el("small",client.available().imageToImage?"Mesin AI tersedia · akses diuji saat proses":"Mesin AI tidak terhubung","bridge-status");
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
  let active=false, viewEpoch=0, current=null, slots=[], result=null, page="home";
  const tell=t=>{global.textContent=t;global.hidden=!t;};
  const compact=window.matchMedia("(max-width: 700px)");
  function setNav(){for(const b of studio.querySelectorAll(".nav button, .nav input, .mobile-bar button"))b.disabled=active;}
  function change(fn){if(active)return;++viewEpoch;tell("");fn();renderNavigation();view.focus({preventScroll:true});view.scrollIntoView({block:"start"});if(compact.matches){const selected=mobileRail.querySelector("[aria-current=page]");if(selected){const r=mobileRail.getBoundingClientRect(),s=selected.getBoundingClientRect();if(s.left<r.left||s.right>r.right)mobileRail.scrollLeft+=s.left-r.left-(r.width-s.width)/2;}}}
  const home=button("Asisten AI",()=>change(chatHome),"nav-main");
  const recent=button("Aset sesi",()=>change(history),"nav-main");
  const clear=button("Bersihkan sesi",()=>{if(active||!window.confirm("Hapus semua aset, percakapan dan input sesi?"))return;change(()=>{store.clear();conversation.clear();slots=[];result=null;current=null;chatHome();tell("Sesi dibersihkan.");});},"nav-main");
  const sideSearch=el("input");sideSearch.type="search";sideSearch.placeholder="Cari alat AI…";sideSearch.setAttribute("aria-label","Cari alat di sidebar");
  const groups=el("div",null,"nav-groups");
  const opened=new Set([CATEGORIES[0]]);
  nav.append(home,recent,sideSearch,groups,clear);
  const mobileButtons=new Map();
  const shortNames={"product-photo":"Foto produk","food-photo":"Foto makanan","ai-model":"Model AI","virtual-try-on":"Try-On","formal-photo":"Foto formal","product-mockup":"Mockup","background":"Background","sharpen":"Pertajam","restore":"Restorasi","poster":"Poster & banner","logo":"Logo","thumbnail":"Thumbnail","seo-caption":"SEO & caption","tiktok-ideas":"Ide TikTok","ad-script":"Naskah iklan","content-calendar":"Kalender"};
  function mobileItem(id,label,full,action){const b=button(label,()=>change(action),"mobile-item");b.setAttribute("aria-label",full);b.title=full;mobileButtons.set(id,b);mobileRail.append(b);}
  mobileItem("home","Asisten AI","Asisten AI",chatHome);mobileItem("history","Aset sesi","Aset sesi",history);
  for(const cat of CATEGORIES)for(const f of findFeatures("",cat))mobileItem(f.id,shortNames[f.id]||f.title,f.title,()=>workspace(f));
  sideSearch.addEventListener("input",renderNavigation);
  function renderNavigation(){
    home.setAttribute("aria-current",page==="home"?"page":"false");
    recent.setAttribute("aria-current",page==="history"?"page":"false");
    recent.textContent="Aset sesi ("+store.list().length+")";
    for(const [id,b] of mobileButtons)b.setAttribute("aria-current",id===(page==="tool"?current?.id:page)?"page":"false");
    mobileButtons.get("history").textContent="Aset ("+store.list().length+")";
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
      try{const res=await client.chat(conversation.prompt(input));conversation.append(input,res.text);field.value="";draw();status.textContent="";ready.textContent="Mesin AI · permintaan terakhir berhasil";}
      catch(e){status.textContent=friendlyError(e);ready.textContent="Mesin AI · permintaan terakhir gagal";}
      finally{active=false;refreshChat();if(!compact.matches)field.focus();}
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
    const epoch=viewEpoch;let loading=0;const revisions=f.slots.map(()=>0);const values={};const inputs=[];const radios=new Map();
    const heading=el("div",null,"tool-heading");heading.append(el("small",f.category),el("h1",f.title),el("p",f.description));view.replaceChildren(heading);
    const layout=el("div",null,"layout"), form=el("section",null,"card input-panel"), output=el("section",null,"card output-panel");
    form.id="studio-input";output.id="studio-output";
    const tabs=el("div",null,"workspace-tabs");const editTab=button("Pengaturan",()=>showPane("input"),"pane-tab");const resultTab=button("Hasil",()=>showPane("output"),"pane-tab");
    editTab.setAttribute("aria-controls",form.id);resultTab.setAttribute("aria-controls",output.id);tabs.append(editTab,resultTab);view.append(tabs);
    function showPane(pane){layout.dataset.pane=pane;editTab.setAttribute("aria-pressed",String(pane==="input"));resultTab.setAttribute("aria-pressed",String(pane==="output"));}
    showPane("input");
    form.append(el("h2",f.slots.length?"1. Foto referensi":"1. Brief & pengaturan"));
    
    const status=el("p","Siap menerima input.","status");status.setAttribute("role","status");
    const run=button("Proses AI",process,"primary"), retry=button("Coba Lagi",process);retry.hidden=true;
    function refresh(){const disabled=active||loading>0;run.disabled=disabled||slots.some(x=>!x)||f.fields.some(p=>p.required&&!String(values[p.id]||"").trim())||!client.available()[{"image-to-image":"imageToImage","text-to-image":"textToImage","text-to-text":"textToText"}[f.engine]];retry.disabled=run.disabled;inputs.forEach(x=>x.disabled=disabled);run.textContent=active?"Sedang memproses…":"Proses AI";setNav();}
    f.slots.forEach((name,i)=>{
      const id="photo-"+i, label=el("label",name);label.htmlFor=id;
      const file=el("input");file.type="file";file.accept="image/jpeg,image/png,image/webp";file.id=id;
      const preview=el("div",null,"source-preview"), picker=el("select");picker.setAttribute("aria-label","Gunakan aset sesi untuk "+name);
      const none=el("option","Pilih hasil sesi…");none.value="";picker.append(none);
      for(const a of store.list().filter(x=>x.kind==="image")){const o=el("option",(getFeature(a.featureId)?.title||a.featureId)+" · "+a.id);o.value=a.id;picker.append(o);}
      const drop=el("div",null,"drop-zone");const browse=button("Pilih foto",()=>file.click(),"upload-button");drop.append(el("span","↑","upload-symbol"),browse,el("small","atau seret foto ke sini"));file.className="native-file";file.tabIndex=-1;
      const remove=button("Hapus foto",()=>{if(active||loading)return;++revisions[i];slots[i]=null;file.value="";picker.value="";draw();refresh();},"subtle");
      function draw(){preview.replaceChildren();drop.hidden=!!slots[i];remove.hidden=!slots[i];if(slots[i])preview.append(image(slots[i]),el("small",slots[i].id?"Aset sesi "+slots[i].id:"Foto perangkat"),remove);}
      async function acceptPhoto(next){if(active||loading)return;const rev=++revisions[i];slots[i]=null;picker.value="";draw();loading++;refresh();try{const a=await readImage(next);if(epoch===viewEpoch&&rev===revisions[i]){slots[i]=a;status.textContent="Foto valid.";}}catch(e){if(epoch===viewEpoch&&rev===revisions[i]){file.value="";status.textContent=friendlyError(e);}}finally{loading--;if(epoch===viewEpoch){draw();refresh();}}}
      file.addEventListener("change",()=>{if(file.files?.[0])acceptPhoto(file.files[0]);});
      drop.addEventListener("dragover",e=>{e.preventDefault();if(!active&&!loading)drop.classList.add("dragging");});drop.addEventListener("dragleave",()=>drop.classList.remove("dragging"));drop.addEventListener("drop",e=>{e.preventDefault();drop.classList.remove("dragging");if(!active&&!loading&&e.dataTransfer?.files?.[0]){file.value="";acceptPhoto(e.dataTransfer.files[0]);}});
      picker.addEventListener("change",()=>{if(active)return;++revisions[i];slots[i]=store.get(picker.value)||null;file.value="";draw();refresh();});
      const upload=el("div",null,"upload-zone");upload.append(label,file,drop,el("small","JPG, PNG, WebP · maks. 8 MB per foto"));if(f.id==="virtual-try-on")upload.append(el("small",i===0?"Gunakan foto tubuh dengan area pakaian terlihat jelas. Foto wajah saja hanya dapat mengedit pakaian yang terlihat; jangan gunakan untuk try-on seluruh badan.":"Gunakan foto pakaian yang jelas, idealnya tanpa model lain. Hanya pakaian dari foto ini yang ditransfer."));upload.append(picker,preview);if(initial&&initialIndex===i)picker.value=initial.id;inputs.push(file,picker,browse,remove);form.append(upload);draw();
    });
    if(f.slots.length)form.append(el("h2","2. Pengaturan edit","section-heading"));
    const presets=validatePresets(f), presetLabel=el("label","Preset kerja");presetLabel.htmlFor="studio-preset";
    const presetPicker=el("select");presetPicker.id="studio-preset";presetPicker.setAttribute("aria-label","Preset kerja");
    const manual=el("option","Pengaturan sendiri");manual.value="";presetPicker.append(manual);
    presets.forEach((p,i)=>{const op=el("option",p.label);op.value=String(i);presetPicker.append(op);});
    presetPicker.addEventListener("change",()=>{if(active||!presetPicker.value)return;Object.assign(values,applyPreset(f,values,Number(presetPicker.value)));for(const [id,items] of radios)for(const radio of items)radio.checked=values[id]===radio.value;refresh();});
    form.append(presetLabel,presetPicker);inputs.push(presetPicker);
    for(const field of f.fields){
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
        });fieldset.append(choices);form.append(fieldset);
      }else{
        const input=el("textarea");input.id=id;input.rows=field.required?4:2;input.maxLength=field.max||1200;input.value=values[field.id];input.required=!!field.required;
        input.addEventListener("input",()=>{values[field.id]=input.value;refresh();});inputs.push(input);form.append(label,input);
      }
    }
    const info=el("details",null,"tool-info");info.append(el("summary","Privasi & informasi"),el("p","Input dikirim ke Gemini saat diproses. Hindari data sensitif. Preservasi visual adalah upaya model, bukan penguncian piksel."));form.append(info,status);
    const actions=el("div",null,"actions");actions.append(run,retry);form.append(actions);output.append(el("h2","Hasil kerja"),el("p","Hasil akan muncul di sini setelah proses AI selesai.","empty result-placeholder"));layout.append(form,output);view.append(layout);refresh();
    async function process(){
      if(active||loading||slots.some(x=>!x))return;
      active=true;retry.hidden=true;result=null;output.replaceChildren(el("p","Memproses…","empty"));status.textContent="Mengirim satu permintaan AI…";refresh();
      try{
        const res=await client.execute(f,{...values},slots);
        let verified=res;if(res.kind==="image"){const dimensions=await decodeImage(res);verified={...res,width:dimensions.width,height:dimensions.height};}
        verified={...verified,quality:assessOutput(f,values,verified,slots)};
        const jobSources=[...slots], parents=jobSources.filter(x=>x.id).map(x=>x.id);
        const adjust=()=>{if(active)return;showPane("input");const notes=form.querySelector("#param-notes");if(notes){notes.scrollIntoView({block:"center"});notes.focus();}status.textContent="Sesuaikan pengaturan sebelum memproses ulang.";};
        const finish=accepted=>{
          result=store.add(accepted,f.id,parents);resultCard(result,output);
          if(jobSources.length){const compare=el("details",null,"quality-panel");compare.append(el("summary","Bandingkan foto sumber"));jobSources.forEach((source,i)=>{compare.append(el("small",f.slots[i]),image(source));});output.append(compare);}
          output.append(button("Sesuaikan & buat ulang",adjust));
          status.textContent=(verified.quality.checks.some(c=>c.state==="warn")?"Perlu diperiksa · ":"Selesai · ")+(res.elapsedMs/1000).toFixed(1)+" detik";
          ready.textContent="Mesin AI · permintaan terakhir berhasil";renderNavigation();
        };
        showPane("output");if(compact.matches)tabs.scrollIntoView({block:"start"});
        if(needsReferenceReview(f)){
          const review=createReferenceReview(f,verified,jobSources);
          output.replaceChildren(el("h2","Periksa hasil"),el("p","Pastikan subjek, wajah (jika ada), dan detail asli tetap sesuai. Hasil belum disimpan."));
          const comparison=el("div",null,"reference-compare");
          const original=el("figure");original.append(el("figcaption","Foto asli"),image(jobSources[0]));
          const candidate=el("figure");candidate.append(el("figcaption","Hasil AI"),image(verified));comparison.append(original,candidate);output.append(comparison);
          if(jobSources.length>1){const reference=el("details",null,"quality-panel");reference.append(el("summary","Referensi tambahan"));jobSources.slice(1).forEach((s,i)=>reference.append(el("small",f.slots[i+1]),image(s)));output.append(reference);}
          const warnings=verified.quality.checks.filter(c=>c.state==="warn");
          for(const warning of warnings)output.append(el("small",warning.label,"quality-warn"));
          const actions=el("div",null,"actions");
          actions.append(button("Sesuai, gunakan",()=>{if(active||epoch!==viewEpoch||review.state()!=="pending")return;try{finish(review.accept());}catch(e){output.replaceChildren(el("p",friendlyError(e)));}},"primary"),
          button("Tidak sesuai",()=>{if(active||epoch!==viewEpoch||review.state()!=="pending")return;review.reject();result=null;output.replaceChildren(el("h2","Hasil ditolak"),el("p","Foto sumber tetap utuh. Hasil tidak disimpan atau dipakai ulang."),button("Kembali ke pengaturan",adjust));status.textContent="Hasil ditolak oleh pengguna.";ready.textContent="Hasil tidak disetujui";}));
          output.append(actions);status.textContent="Menunggu pemeriksaan hasil.";ready.textContent="Hasil AI belum disetujui";
        }else finish(verified);
      }catch(e){output.replaceChildren(el("p","Tidak ada hasil yang valid.","empty"));status.textContent=friendlyError(e);ready.textContent="Mesin AI · permintaan terakhir gagal";retry.hidden=false;}
      finally{active=false;refresh();}
    }
  }
  chatHome();renderNavigation();
}
