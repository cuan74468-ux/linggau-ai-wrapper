import { normalize, RATIOS } from "./parameters.js";
import { buildPrompt } from "./universal-lock.js";
export const MAX_IMAGE = 8*1024*1024, MAX_TOTAL = 12*1024*1024;
export const IMAGE_TYPES = ["image/jpeg","image/png","image/webp"];
export function imageBytes(image) {
  if(!image || !IMAGE_TYPES.includes(image.mimeType) || typeof image.base64!=="string" || !image.base64 || image.base64.length%4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw new Error("AI_INPUT_INVALID");
  return image.base64.length*3/4-(image.base64.endsWith("==")?2:image.base64.endsWith("=")?1:0);
}
// Bridge outputs are untrusted. Only actual payload and bounded diagnostics
// cross this boundary; the bridge cannot grant review or pixel verification.
function validatedResult(result,kind,elapsedMs){
 if(result?.kind!==kind)throw Error("AI_OUTPUT_INVALID");
 const meta={elapsedMs:Number.isFinite(result.elapsedMs)&&result.elapsedMs>=0?Math.min(result.elapsedMs,3600000):Math.round(elapsedMs)};
 if(typeof result.model==="string"&&/^[a-zA-Z0-9._/-]{1,120}$/.test(result.model))meta.model=result.model;
 if(Number.isInteger(result.httpStatus)&&result.httpStatus>=200&&result.httpStatus<300)meta.httpStatus=result.httpStatus;
 if(kind==="text"){
  if(typeof result.text!=="string"||!result.text.trim()||result.text.length>40000)throw Error("AI_OUTPUT_INVALID");
  return {kind,text:result.text,...meta};
 }
 try{if(imageBytes(result)>MAX_IMAGE)throw Error("AI_OUTPUT_INVALID");}catch{throw Error("AI_OUTPUT_INVALID");}
 return {kind,mimeType:result.mimeType,base64:result.base64,...meta};
}
export function createAIClient(bridge,{signal}={}) {
  let active=false;
  const methods=Object.freeze({"image-to-image":"editImage","text-to-image":"generateImage","text-to-text":"generateText"});
  const ready=method=>bridge?.available!==false&&typeof bridge?.[method]==="function";
  async function invoke(method,req,kind){
    if(active)throw Error("AI_BUSY");
    if(signal?.aborted)throw Error("AI_CANCELLED");
    if(!ready(method))throw Error("AI_BRIDGE_NOT_CONNECTED");
    active=true;const start=performance.now();
    try{
      const result=await bridge[method]({...req,...(signal?{signal}:{})});
      if(signal?.aborted)throw Error("AI_CANCELLED");
      return validatedResult(result,kind,performance.now()-start);
    }finally{active=false;}
  }
  async function execute(feature, values, images=[]) {
    if(active) throw Error("AI_BUSY");
    const method=methods[feature?.engine];
    if(!method||!ready(method))throw Error("AI_BRIDGE_NOT_CONNECTED");
    const normalized=normalize(feature,values);
    if(!Array.isArray(images)||images.length!==feature.slots.length) throw new Error("Lengkapi semua foto referensi.");
    const sizes=images.map(imageBytes);
    if(sizes.some(s=>s>MAX_IMAGE)||sizes.reduce((a,b)=>a+b,0)>MAX_TOTAL) throw new Error("IMAGE_LIMIT");
    const prompt=buildPrompt(feature,normalized,images);
    if(prompt.length>12000)throw Error("PROMPT_LIMIT");
    const aspectRatio=feature.engine!=="text-to-text"&&RATIOS.includes(normalized.ratio)&&normalized.ratio!=="auto"?normalized.ratio:undefined;
    const req={prompt,images:images.map(({mimeType,base64})=>({mimeType,base64})),...(aspectRatio?{aspectRatio}:{})};
    return invoke(method,req,feature.engine==="text-to-text"?"text":"image");
  }
  function validPrompt(prompt){if(typeof prompt!=="string"||!prompt.trim()||prompt.length>12000)throw Error("PROMPT_LIMIT");return prompt;}
  async function chat(prompt){
    if(active)throw Error("AI_BUSY");
    return invoke("generateText",{prompt:validPrompt(prompt),images:[]},"text");
  }
  async function backdrop(prompt){
    if(active)throw Error("AI_BUSY");
    return invoke("generateImage",{prompt:validPrompt(prompt),images:[]},"image");
  }
  return Object.freeze({execute,chat,backdrop,available:()=>Object.freeze({imageToImage:ready("editImage"),textToImage:ready("generateImage"),textToText:ready("generateText")}),busy:()=>active});
}
export function friendlyError(error){
  const m=String(error?.message||error);
  if(m.includes("IMAGE_LIMIT_OR_FORMAT")) return "Pilih foto JPG, PNG atau WebP dengan ukuran maksimal 8 MB.";
  if(m.includes("IMAGE_DIMENSIONS_INVALID")) return "Resolusi foto terlalu besar atau foto tidak dapat dibuka. Pilih foto lain.";
  if(m.includes("LOCAL_IMAGE_LIMIT")) return "Mode lokal mendukung foto hingga 4 megapiksel dan sisi maksimal 4096 px. Gunakan foto lebih kecil.";
  if(m.includes("LOCAL_OUTPUT_LIMIT")) return "PNG hasil melebihi 8 MB. Gunakan foto beresolusi lebih kecil.";
  if(m.includes("PIXEL_VERIFY_FAILED")) return "Piksel terlindungi berubah saat ekspor. Hasil ditolak; foto sumber tetap utuh.";
  if(m.includes("ALPHA_MASK_UNAVAILABLE")) return "Foto tidak memiliki latar transparan yang cukup. Tandai objek secara manual.";
  if(m.includes("MASK_")) return "Objek belum dapat dipisahkan dengan tepat. Coba foto yang objek dan latarnya lebih jelas, atau buka koreksi objek.";
  if(m.includes("BACKGROUND_UNCHANGED")) return "Pilih latar baru atau isi deskripsi latar.";
  if(m.includes("LOCAL_CANVAS")) return "Pemrosesan lokal tidak tersedia pada browser ini.";
  if(m.includes("401")) return "Akses AI belum terautentikasi. Pastikan akun Google masuk, beri waktu runtime siap, lalu tekan Coba Lagi secara manual.";
  if(m.includes("403")) return "Akses AI ditolak. Periksa izin akun dan fitur Gemini. Jangan memasukkan API key atau mengaktifkan billing.";
  if(m.includes("429")) return "Batas pemakaian AI tercapai. Coba lagi nanti secara manual.";
  if(m.includes("TIMEOUT")) return "Permintaan melewati batas waktu. Hasil tidak diterima; pemrosesan server mungkin tetap berjalan.";
  if(m.includes("404")) return "Model AI tidak tersedia pada runtime ini.";
  if(m.includes("400")) return "Model menolak konfigurasi atau input. Ubah parameter (misalnya rasio Otomatis) sebelum mencoba lagi.";
  if(m.includes("IMAGE_LIMIT")) return "Ukuran gambar melebihi batas 8 MB per foto atau 12 MB total.";
  if(m.includes("AI_BRIDGE_NOT_CONNECTED")) return "Koneksi AI belum tersedia. Buka ulang aplikasi dan coba lagi."
  if(m.includes("AI_NO_VALID")||m.includes("AI_OUTPUT_INVALID")) return "AI tidak mengembalikan hasil yang valid.";
  if(m.includes("PROMPT_LIMIT")) return "Brief terlalu panjang. Ringkas masukan sebelum menjalankan AI.";
  if(m.includes("AI_BUSY")) return "Satu permintaan masih berjalan.";
  if(m.includes("AI_CANCELLED"))return "Proses dibatalkan.";
  if(m.includes("PARAMETER_TOO_LONG"))return "Isian terlalu panjang. Ringkas teks sebelum memproses.";
  if(m.startsWith("Lengkapi "))return "Lengkapi semua isian dan foto referensi yang wajib.";
  if(m.includes("AI_INPUT_INVALID")||m.includes("INVALID_PARAMETER"))return "Periksa foto dan pengaturan sebelum memproses.";
  console.warn("LINGGAU_TOOL_ERROR",/^[A-Z][A-Z0-9_]{2,79}$/.test(m)?m:"UNEXPECTED_ERROR");
  return "Proses belum berhasil. Periksa masukan atau coba lagi." ;
}
