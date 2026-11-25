import { findFeatures, getFeature, CATEGORIES } from "./core/feature-registry.js";
import { createAIClient, friendlyError } from "./core/ai-client.js";
import { createAssetStore } from "./core/assets.js";
import { readImage, decodeImage } from "./core/images.js";

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
export async function mount({root,ai,version}){
  if(!(root instanceof HTMLElement))throw new Error("APP_ROOT_INVALID");
  const client=createAIClient(ai), store=createAssetStore();
  const css=el("link");css.rel="stylesheet";css.href=new URL("./styles/studio.css",import.meta.url).href;
  const studio=el("section");studio.id="studio";
  const top=el("header",null,"top");
  const brand=el("div",null,"brand");
  brand.append(el("span","L","brandmark"));
  const identity=el("div");identity.append(el("strong","Linggau AI Studio"),el("small","Workspace kreatif · v"+version));brand.append(identity);
  const ready=el("small",client.available().imageToImage?"AI Bridge tersedia · akses diuji saat proses":"AI Bridge tidak terhubung","bridge-status");
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
  const opened=new Set(CATEGORIES);
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
    function render(){grid.replaceChildren();const list=findFeatures(query,category);if(!list.length)grid.append(el("p","Tidak ada fitur yang cocok.","empty"));for(const f of list){const b=button("",()=>change(()=>workspace(f)),"tool");b.append(el("small",f.category),el("strong",f.title),el("small",f.description),el("small",f.engine));grid.append(b);}}
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
    if(asset.kind==="image"){target.append(image(asset),button("Unduh",()=>download(asset),"primary"));}
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
    const status=el("p","Siap menerima input.","status");status.setAttribute("role","status");
    const run=button("Proses AI",process,"primary"), retry=button("Coba Lagi",process);retry.hidden=true;
    function refresh(){const disabled=active||loading>0;run.disabled=disabled||slots.some(x=>!x)||!client.available()[{"image-to-image":"imageToImage","text-to-image":"textToImage","text-to-text":"textToText"}[f.engine]];retry.disabled=run.disabled;inputs.forEach(x=>x.disabled=disabled);setNav();}
    f.slots.forEach((name,i)=>{
      const id="photo-"+i, label=el("label",name);label.htmlFor=id;
      const file=el("input");file.type="file";file.accept="image/jpeg,image/png,image/webp";file.id=id;
      const preview=el("div"), picker=el("select");picker.setAttribute("aria-label","Gunakan aset sesi untuk "+name);
      const none=el("option","Pilih hasil sesi…");none.value="";picker.append(none);
      for(const a of store.list().filter(x=>x.kind==="image")){const o=el("option",(getFeature(a.featureId)?.title||a.featureId)+" · "+a.id);o.value=a.id;picker.append(o);}
      function draw(){preview.replaceChildren();if(slots[i])preview.append(image(slots[i]),el("small",slots[i].id?"Aset sesi "+slots[i].id:"Foto perangkat"));else preview.append(el("small","Belum ada foto"));}
      file.addEventListener("change",async()=>{if(active)return;const rev=++revisions[i];slots[i]=null;draw();loading++;refresh();try{const a=await readImage(file.files?.[0]);if(epoch===viewEpoch&&rev===revisions[i]){slots[i]=a;status.textContent="Foto valid.";}}catch(e){if(epoch===viewEpoch&&rev===revisions[i]){file.value="";status.textContent=friendlyError(e);}}finally{loading--;if(epoch===viewEpoch){draw();refresh();}}});
      picker.addEventListener("change",()=>{if(active)return;++revisions[i];slots[i]=store.get(picker.value)||null;file.value="";draw();refresh();});
      const upload=el("div",null,"upload-zone");upload.append(label,file,el("small","JPG, PNG, WebP · maks. 8 MB per foto"));if(f.id==="virtual-try-on")upload.append(el("small",i===0?"Gunakan foto tubuh dengan area pakaian terlihat jelas. Foto wajah saja hanya dapat mengedit pakaian yang terlihat; jangan gunakan untuk try-on seluruh badan.":"Gunakan foto pakaian yang jelas, idealnya tanpa model lain. Hanya pakaian dari foto ini yang ditransfer."));upload.append(picker,preview);inputs.push(file,picker);form.append(upload);draw();
    });
    if(f.slots.length)form.append(el("h2","2. Pengaturan edit","section-heading"));
    for(const field of f.fields){const id="param-"+field.id,label=el("label",field.label+(field.required?" *":""));label.htmlFor=id;const input=el(field.options?"select":"textarea");input.id=id;
      if(field.options)for(const val of field.options){const o=el("option",val);o.value=val;input.append(o);}else{input.rows=3;input.maxLength=field.max||1200;}
      input.value=field.default||"";values[field.id]=input.value;input.addEventListener("input",()=>{values[field.id]=input.value;});inputs.push(input);form.append(label,input);
    }
    form.append(el("small","Foto dikirim ke layanan Gemini saat Anda menekan Proses AI. Hindari data sensitif; kebijakan retensi Google tetap berlaku."),el("small","Preservasi visual diupayakan, bukan penguncian piksel."),status);
    const actions=el("div",null,"actions");actions.append(run,retry);form.append(actions);output.append(el("h2","Hasil kerja"),el("p","Hasil akan muncul di sini setelah proses AI selesai.","empty result-placeholder"));layout.append(form,output);view.append(layout);refresh();
    async function process(){
      if(active||loading||slots.some(x=>!x))return;
      active=true;retry.hidden=true;result=null;output.replaceChildren(el("p","Memproses…","empty"));status.textContent="Mengirim satu permintaan AI…";refresh();
      try{
        const res=await client.execute(f,{...values},slots);
        if(res.kind==="image")await decodeImage(res);
        result=store.add(res,f.id,slots.filter(x=>x.id).map(x=>x.id));resultCard(result,output);
        status.textContent="AI: SUCCESS · HTTP "+res.httpStatus+" · "+res.elapsedMs+" ms";renderNavigation();
      }catch(e){output.replaceChildren(el("p","Tidak ada hasil yang valid.","empty"));status.textContent=friendlyError(e);retry.hidden=false;}
      finally{active=false;refresh();}
    }
  }
  catalog();renderNavigation();
}
