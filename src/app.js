import { findFeatures, getFeature, CATEGORIES } from "./core/feature-registry.js";
import { createAIClient, friendlyError } from "./core/ai-client.js";
import { createAssetStore } from "./core/assets.js";
import { readImage, decodeImage } from "./core/images.js";
import {getSkill} from "./core/skills.js";
import {assessOutput} from "./core/quality.js";

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
  const client=createAIClient(ai), store=createAssetStore();
  const css=el("link");css.rel="stylesheet";css.href=new URL("./styles/studio.css",import.meta.url).href;
  const studio=el("section");studio.id="studio";
  const top=el("header",null,"top");
  const brand=el("div",null,"brand");
  brand.append(el("span","L","brandmark"));
  const identity=el("div");identity.append(el("strong","Linggau AI Studio"),el("small","Workspace kreatif · v"+version+(revision?" · "+revision.slice(0,7):"")));brand.append(identity);
  const ready=el("small",client.available().imageToImage?"Mesin AI tersedia · akses diuji saat proses":"Mesin AI tidak terhubung","bridge-status");
  const toggle=button("☰  Alat AI",()=>setDrawer(!drawerOpen),"menu-toggle");toggle.setAttribute("aria-controls","studio-sidebar");toggle.setAttribute("aria-expanded","false");
  top.append(brand,ready,toggle);
  const sidebar=el("aside",null,"sidebar");sidebar.id="studio-sidebar";
  const nav=el("nav",null,"nav");nav.setAttribute("aria-label","Seluruh alat AI");
  const view=el("div",null,"workspace");view.id="studio-workspace";view.setAttribute("role","region");view.setAttribute("aria-label","Area kerja");view.tabIndex=-1;
  const global=el("p",null,"status");global.setAttribute("role","status");global.hidden=true;
  const work=el("div",null,"work");work.append(global,view);
  const frame=el("div",null,"frame");sidebar.append(nav);frame.append(sidebar,work);
  studio.append(top,frame);root.replaceChildren(css,studio);
  let active=false, viewEpoch=0, current=null, slots=[], query="", category="all", result=null, drawerOpen=false, page="home";
  const tell=t=>{global.textContent=t;global.hidden=!t;};
  function setDrawer(open){drawerOpen=open;studio.classList.toggle("drawer-open",open);toggle.setAttribute("aria-expanded",String(open));}
  studio.addEventListener("keydown",e=>{if(e.key==="Escape"&&drawerOpen){setDrawer(false);toggle.focus();}});
  function setNav(){for(const b of nav.querySelectorAll("button, input"))b.disabled=active;}
  function change(fn){if(active)return;++viewEpoch;tell("");setDrawer(false);fn();renderNavigation();view.focus({preventScroll:true});view.scrollIntoView({block:"start"});}
  const home=button("Beranda",()=>change(catalog),"nav-main");
  const recent=button("Riwayat hasil",()=>change(history),"nav-main");
  const clear=button("Bersihkan sesi",()=>change(()=>{if(!window.confirm("Hapus semua hasil sesi dan input aktif?"))return;store.clear();slots=[];result=null;current=null;catalog();tell("Riwayat dan input sesi dibersihkan.");}),"nav-main");
  const sideSearch=el("input");sideSearch.type="search";sideSearch.placeholder="Cari alat AI…";sideSearch.setAttribute("aria-label","Cari alat di sidebar");
  const groups=el("div",null,"nav-groups");
  const opened=new Set([CATEGORIES[0]]);
  nav.append(home,recent,sideSearch,groups,clear);
  sideSearch.addEventListener("input",renderNavigation);
  function renderNavigation(){
    home.setAttribute("aria-current",page==="home"?"page":"false");
    recent.setAttribute("aria-current",page==="history"?"page":"false");
    recent.textContent="Riwayat hasil ("+store.list().length+")";
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
  function catalog(){
    page="home";current=null;slots=[];result=null;view.replaceChildren(el("h1","Ruang kerja kreatif"),el("p","Pilih alat dari sidebar atau katalog di bawah. Setiap alat memiliki pengaturan dan hasil tersendiri."));
    const search=el("input");search.type="search";search.placeholder="Cari fitur...";search.value=query;search.setAttribute("aria-label","Cari fitur");
    const filter=el("select");filter.setAttribute("aria-label","Kategori");
    for(const c of ["all",...CATEGORIES]){const option=el("option",c==="all"?"Semua kategori":c);option.value=c;filter.append(option);}filter.value=category;
    const controls=el("div",null,"grid");controls.append(search,filter);view.append(controls);
    const grid=el("div",null,"grid");grid.style.marginTop="16px";view.append(grid);
    function render(){grid.replaceChildren();const list=findFeatures(query,category);if(!list.length)grid.append(el("p","Tidak ada fitur yang cocok.","empty"));for(const f of list){const b=button("",()=>change(()=>workspace(f)),"tool");b.append(el("small",f.category),el("strong",f.title),el("small",f.description),el("small",({"image-to-image":"Edit foto","text-to-image":"Buat gambar","text-to-text":"Buat teks"})[f.engine],"engine-label"));grid.append(b);}}
    search.addEventListener("input",()=>{query=search.value;render();});filter.addEventListener("change",()=>{category=filter.value;render();});render();
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
    target.append(el("small","Model: "+asset.model+" · HTTP "+asset.httpStatus+" · "+asset.elapsedMs+" ms"));
    if(asset.quality){
      const panel=el("details",null,"quality-panel");panel.open=asset.quality.checks.some(c=>c.state==="warn");
      panel.append(el("summary","Pemeriksaan hasil"),el("small","Pemeriksaan lokal: dimensi, rasio atau keberadaan judul bagian. Bukan jaminan kualitas AI."));
      for(const c of asset.quality.checks)panel.append(el("p",(c.state==="pass"?"✓ ":"! ")+c.label,c.state==="pass"?"quality-pass":"quality-warn"));
      panel.append(el("strong","Periksa secara visual / manual"));
      for(const item of asset.quality.review)panel.append(el("p","• "+item,"quality-review"));
      target.append(panel);
    }
    if(asset.kind==="image"){
      const sel=el("select");sel.setAttribute("aria-label","Fitur tujuan");const placeholder=el("option","Pakai ulang ke fitur…");placeholder.value="";sel.append(placeholder);
      for(const f of findFeatures().filter(x=>x.slots.length))f.slots.forEach((s,i)=>{const op=el("option",f.title+" — "+s);op.value=f.id+":"+i;sel.append(op);});
      target.append(sel,button("Pakai ulang",()=>{if(!sel.value)return;const [id,i]=sel.value.split(":");change(()=>workspace(getFeature(id),asset,Number(i)));}));
    }
  }
  function history(){
    page="history";current=null;slots=[];result=null;view.replaceChildren(el("h1","Riwayat hasil sesi"),el("p","Hanya di memori. Maksimal 10 hasil, dapat berkurang sesuai batas memori. Hilang saat halaman ditutup atau dimuat ulang."));
    const grid=el("div",null,"grid");view.append(grid);
    for(const a of store.list()){const c=el("article",null,"card");resultCard(a,c);c.append(el("small","Asal aset: "+(a.parents.join(", ")||"input baru")),button("Hapus hasil",()=>change(()=>{store.remove(a.id);history();})));grid.append(c);}
    if(!store.list().length)grid.append(el("p","Belum ada hasil.","empty"));
  }
  function workspace(f,initial=null,initialIndex=0){
    page="tool";current=f;slots=f.slots.map(()=>null);result=null;if(initial)slots[initialIndex]=initial;
    const epoch=viewEpoch;let loading=0;const revisions=f.slots.map(()=>0);const values={};const inputs=[];
    const heading=el("div",null,"tool-heading");heading.append(el("small",f.category),el("h1",f.title),el("p",f.description));view.replaceChildren(heading);
    const layout=el("div",null,"layout"), form=el("section",null,"card input-panel"), output=el("section",null,"card output-panel");
    form.append(el("h2",f.slots.length?"1. Foto referensi":"1. Brief & pengaturan"));
    const guidance=el("details",null,"quality-panel");guidance.append(el("summary","Standar kualitas alat ini"));for(const item of getSkill(f.id).review)guidance.append(el("p","• "+item,"quality-review"));form.append(guidance);
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
    for(const field of f.fields){
      const id="param-"+field.id, label=el("label",field.label+(field.required?" *":""));label.htmlFor=id;
      values[field.id]=field.default||"";
      if(field.options){
        const fieldset=el("fieldset",null,"param-group");const legend=el("legend",field.label);fieldset.append(legend);
        const choices=el("div",null,field.id==="ratio"?"choice-grid ratio-grid":"choice-grid");
        field.options.forEach((val,i)=>{
          const choice=el("label",null,"choice");const input=el("input");input.type="radio";input.name=id;input.value=val;input.id=id+"-"+i;input.checked=val===values[field.id];
          const caption=el("span",val==="auto"?"Otomatis":val);
          if(field.id==="ratio"&&val!=="auto"){const shape=el("span",null,"ratio-shape");const [w,h]=val.split(":").map(Number);shape.style.width=String(22*w/Math.max(w,h))+"px";shape.style.height=String(22*h/Math.max(w,h))+"px";caption.prepend(shape);}
          input.addEventListener("change",()=>{if(input.checked){values[field.id]=input.value;refresh();}});
          choice.append(input,caption);choices.append(choice);inputs.push(input);
        });fieldset.append(choices);form.append(fieldset);
      }else{
        const input=el("textarea");input.id=id;input.rows=field.required?4:2;input.maxLength=field.max||1200;input.value=values[field.id];input.required=!!field.required;
        input.addEventListener("input",()=>{values[field.id]=input.value;refresh();});inputs.push(input);form.append(label,input);
      }
    }
    form.append(el("small","Foto dikirim ke layanan Gemini saat Anda menekan Proses AI. Hindari data sensitif; kebijakan retensi Google tetap berlaku."),el("small","Preservasi visual diupayakan, bukan penguncian piksel."),status);
    const actions=el("div",null,"actions");actions.append(run,retry);form.append(actions);output.append(el("h2","Hasil kerja"),el("p","Hasil akan muncul di sini setelah proses AI selesai.","empty result-placeholder"));layout.append(form,output);view.append(layout);refresh();
    async function process(){
      if(active||loading||slots.some(x=>!x))return;
      active=true;retry.hidden=true;result=null;output.replaceChildren(el("p","Memproses…","empty"));status.textContent="Mengirim satu permintaan AI…";refresh();
      try{
        const res=await client.execute(f,{...values},slots);
        let verified=res;if(res.kind==="image"){const dimensions=await decodeImage(res);verified={...res,width:dimensions.width,height:dimensions.height};}
        verified={...verified,quality:assessOutput(f,values,verified)};
        result=store.add(verified,f.id,slots.filter(x=>x.id).map(x=>x.id));resultCard(result,output);
        if(res.kind==="image"&&slots.length){
          const compare=el("details",null,"quality-panel");compare.append(el("summary","Bandingkan foto sumber"));slots.forEach((source,i)=>{compare.append(el("small",f.slots[i]),image(source));});output.append(compare);
        }
        output.append(button("Sesuaikan & buat ulang",()=>{if(active)return;const notes=form.querySelector("#param-notes");if(notes){notes.scrollIntoView({block:"center"});notes.focus();}status.textContent="Sesuaikan parameter atau catatan. Tekan Proses AI untuk satu permintaan baru; hasil sebelumnya tetap di riwayat.";}));
        status.textContent="Selesai · "+(res.elapsedMs/1000).toFixed(1)+" detik. Periksa kesesuaian hasil sebelum digunakan.";ready.textContent="Mesin AI · permintaan terakhir berhasil";renderNavigation();
      }catch(e){output.replaceChildren(el("p","Tidak ada hasil yang valid.","empty"));status.textContent=friendlyError(e);ready.textContent="Mesin AI · permintaan terakhir gagal";retry.hidden=false;}
      finally{active=false;refresh();}
    }
  }
  catalog();renderNavigation();
}
