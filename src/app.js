import { findFeatures, getFeature, CATEGORIES } from "./core/feature-registry.js";
import { createAIClient, friendlyError } from "./core/ai-client.js";
import { createAssetStore } from "./core/assets.js";
import { readImage, decodeImage } from "./core/images.js";

function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,cls){const n=el("button",text,cls);n.type="button";n.addEventListener("click",fn);return n;}
function image(asset){const n=el("img");n.alt="Aset visual";n.src="data:"+asset.mimeType+";base64,"+asset.base64;return n;}
function download(asset){const a=el("a");const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[asset.mimeType];const blob=new Blob([Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0))],{type:asset.mimeType});const url=URL.createObjectURL(blob);a.href=url;a.download="linggau-"+asset.id+"."+ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function copy(text){if(!navigator.clipboard?.writeText)throw new Error("Clipboard tidak tersedia. Pilih teks hasil secara manual.");await navigator.clipboard.writeText(text);}
export async function mount({root,ai,version}){
  if(!(root instanceof HTMLElement))throw new Error("APP_ROOT_INVALID");
  const client=createAIClient(ai), store=createAssetStore();
  const css=el("link");css.rel="stylesheet";css.href=new URL("./styles/studio.css",import.meta.url).href;
  const studio=el("section");studio.id="studio";
  const top=el("header",null,"top");
  const brand=el("div");brand.append(el("strong","Linggau AI Studio"),el("small","Workspace kreatif · v"+version));
  const ready=el("small","Bridge: "+(client.available().imageToImage?"tersedia · autentikasi diuji saat proses":"tidak terhubung"));
  top.append(brand,ready);
  const nav=el("nav",null,"nav"), view=el("main"), global=el("p",null,"status");global.setAttribute("role","status");global.hidden=true;
  studio.append(top,nav,global,view);root.replaceChildren(css,studio);
  let active=false, viewEpoch=0, current=null, slots=[], query="", category="all", result=null;
  const tell=t=>{global.textContent=t;global.hidden=!t;};
  function setNav(){for(const b of nav.querySelectorAll("button"))b.disabled=active;}
  function change(fn){if(active)return;++viewEpoch;tell("");fn();}
  nav.append(button("Studio",()=>change(catalog)),button("Riwayat sesi",()=>change(history)),button("Bersihkan sesi",()=>change(()=>{if(!window.confirm("Hapus semua hasil sesi dan input aktif?"))return;store.clear();slots=[];result=null;current=null;catalog();tell("Riwayat dan input sesi dibersihkan.");})));
  function catalog(){
    current=null;slots=[];result=null;view.replaceChildren(el("h1","Ruang kerja kreatif"),el("p","Pilih alat AI untuk foto, desain, atau kebutuhan bisnis."));
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
    else{target.append(el("pre",asset.text),button("Salin teks",async()=>{try{await copy(asset.text);tell("Teks disalin.");}catch(e){tell(e.message);}}));}
    target.append(el("small","Model: "+asset.model+" · HTTP "+asset.httpStatus+" · "+asset.elapsedMs+" ms"));
    if(asset.kind==="image"){
      const sel=el("select");sel.setAttribute("aria-label","Fitur tujuan");const placeholder=el("option","Pakai ulang ke fitur…");placeholder.value="";sel.append(placeholder);
      for(const f of findFeatures().filter(x=>x.slots.length))f.slots.forEach((s,i)=>{const op=el("option",f.title+" — "+s);op.value=f.id+":"+i;sel.append(op);});
      target.append(sel,button("Pakai ulang",()=>{if(!sel.value)return;const [id,i]=sel.value.split(":");change(()=>workspace(getFeature(id),asset,Number(i)));}));
    }
  }
  function history(){
    current=null;slots=[];result=null;view.replaceChildren(el("h1","Riwayat hasil sesi"),el("p","Hanya di memori. Maksimal 10 hasil, dapat berkurang sesuai batas memori. Hilang saat halaman ditutup atau dimuat ulang."));
    const grid=el("div",null,"grid");view.append(grid);
    for(const a of store.list()){const c=el("article",null,"card");resultCard(a,c);c.append(el("small","Asal aset: "+(a.parents.join(", ")||"input baru")),button("Hapus hasil",()=>change(()=>{store.remove(a.id);history();})));grid.append(c);}
    if(!store.list().length)grid.append(el("p","Belum ada hasil.","empty"));
  }
  function workspace(f,initial=null,initialIndex=0){
    current=f;slots=f.slots.map(()=>null);result=null;if(initial)slots[initialIndex]=initial;
    const epoch=viewEpoch;let loading=0;const revisions=f.slots.map(()=>0);const values={};const inputs=[];
    view.replaceChildren(button("Kembali ke Studio",()=>change(catalog)),el("h1",f.title),el("p",f.description));
    const layout=el("div",null,"layout"), form=el("section",null,"card"), output=el("section",null,"card");
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
      inputs.push(file,picker);form.append(label,file,picker,preview);draw();
    });
    for(const field of f.fields){const id="param-"+field.id,label=el("label",field.label+(field.required?" *":""));label.htmlFor=id;const input=el(field.options?"select":"textarea");input.id=id;
      if(field.options)for(const val of field.options){const o=el("option",val);o.value=val;input.append(o);}else{input.rows=3;input.maxLength=field.max||1200;}
      input.value=field.default||"";values[field.id]=input.value;input.addEventListener("input",()=>{values[field.id]=input.value;});inputs.push(input);form.append(label,input);
    }
    form.append(el("small","Foto dikirim ke layanan Gemini saat Anda menekan Proses AI. Hindari data sensitif; kebijakan retensi Google tetap berlaku."),el("small","Preservasi visual diupayakan, bukan penguncian piksel."),status);
    const actions=el("div",null,"actions");actions.append(run,retry);form.append(actions);output.append(el("p","Hasil akan muncul di sini.","empty"));layout.append(form,output);view.append(layout);refresh();
    async function process(){
      if(active||loading||slots.some(x=>!x))return;
      active=true;retry.hidden=true;result=null;output.replaceChildren(el("p","Memproses…","empty"));status.textContent="Mengirim satu permintaan AI…";refresh();
      try{
        const res=await client.execute(f,{...values},slots);
        if(res.kind==="image")await decodeImage(res);
        result=store.add(res,f.id,slots.filter(x=>x.id).map(x=>x.id));resultCard(result,output);
        status.textContent="AI: SUCCESS · HTTP "+res.httpStatus+" · "+res.elapsedMs+" ms";
      }catch(e){output.replaceChildren(el("p","Tidak ada hasil yang valid.","empty"));status.textContent=friendlyError(e);retry.hidden=false;}
      finally{active=false;refresh();}
    }
  }
  catalog();
}
