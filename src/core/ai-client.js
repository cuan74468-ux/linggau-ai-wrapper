import { normalize, RATIOS } from "./parameters.js";
import { buildPrompt } from "./universal-lock.js";
export const MAX_IMAGE = 8*1024*1024, MAX_TOTAL = 12*1024*1024;
export const IMAGE_TYPES = ["image/jpeg","image/png","image/webp"];
export function imageBytes(image) {
  if(!image || !IMAGE_TYPES.includes(image.mimeType) || typeof image.base64!=="string" || !image.base64 || image.base64.length%4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw new Error("AI_INPUT_INVALID");
  return image.base64.length*3/4-(image.base64.endsWith("==")?2:image.base64.endsWith("=")?1:0);
}
export function createAIClient(bridge) {
  let active=false;
  async function execute(feature, values, images=[]) {
    if(active) throw new Error("AI_BUSY");
    const normalized=normalize(feature,values);
    if(!Array.isArray(images)||images.length!==feature.slots.length) throw new Error("Lengkapi semua foto referensi.");
    const sizes=images.map(imageBytes);
    if(sizes.some(s=>s>MAX_IMAGE)||sizes.reduce((a,b)=>a+b,0)>MAX_TOTAL) throw new Error("IMAGE_LIMIT");
    const prompt=buildPrompt(feature,normalized);
    if(prompt.length>12000)throw new Error("PROMPT_LIMIT");
    const aspectRatio=RATIOS.includes(normalized.ratio)&&normalized.ratio!=="auto"?normalized.ratio:undefined;
    const req={prompt,images:images.map(({mimeType,base64})=>({mimeType,base64})),aspectRatio};
    const methods={"image-to-image":"editImage","text-to-image":"generateImage","text-to-text":"generateText"};
    const method=methods[feature.engine];
    if(!method||typeof bridge?.[method]!=="function") throw new Error("AI_BRIDGE_NOT_CONNECTED");
    active=true;
    try {
      const result=await bridge[method](req);
      if(feature.engine==="text-to-text"){
        if(result?.kind!=="text"||typeof result.text!=="string"||!result.text.trim()||result.text.length>40000) throw new Error("AI_OUTPUT_INVALID");
      }else if(result?.kind!=="image"||imageBytes(result)>MAX_IMAGE) throw new Error("AI_OUTPUT_INVALID");
      return result;
    }finally{active=false;}
  }
  return Object.freeze({execute, available:()=>Object.freeze({imageToImage:typeof bridge?.editImage==="function"&&bridge.available!==false,textToImage:typeof bridge?.generateImage==="function"&&bridge.available!==false,textToText:typeof bridge?.generateText==="function"&&bridge.available!==false}),busy:()=>active});
}
export function friendlyError(error){
  const m=String(error?.message||error);
  if(m.includes("401")) return "Akses AI belum terautentikasi. Pastikan akun Google masuk, beri waktu runtime siap, lalu tekan Coba Lagi secara manual.";
  if(m.includes("403")) return "Akses AI ditolak. Periksa izin akun dan fitur Gemini. Jangan memasukkan API key atau mengaktifkan billing.";
  if(m.includes("429")) return "Batas pemakaian AI tercapai. Coba lagi nanti secara manual.";
  if(m.includes("TIMEOUT")) return "Permintaan melewati batas waktu. Hasil tidak diterima; pemrosesan server mungkin tetap berjalan.";
  if(m.includes("404")) return "Model AI tidak tersedia pada runtime ini.";
  if(m.includes("400")) return "Model menolak konfigurasi atau input. Ubah parameter (misalnya rasio Otomatis) sebelum mencoba lagi.";
  if(m.includes("IMAGE_LIMIT")) return "Ukuran gambar melebihi batas 8 MB per foto atau 12 MB total.";
  if(m.includes("AI_BRIDGE_NOT_CONNECTED")) return "AI Bridge tidak tersedia pada shell ini.";
  if(m.includes("AI_NO_VALID")||m.includes("AI_OUTPUT_INVALID")) return "AI tidak mengembalikan hasil yang valid.";
  if(m.includes("PROMPT_LIMIT")) return "Brief terlalu panjang. Ringkas masukan sebelum menjalankan AI.";
  if(m.includes("AI_BUSY")) return "Satu permintaan masih berjalan.";
  return "Gagal: "+m.slice(0,180);
}
