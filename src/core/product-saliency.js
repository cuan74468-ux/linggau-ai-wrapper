// Local lightweight foreground saliency pilot. No image upload.
import {validateMask} from "./vision-mask.js";
const BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const MODEL="https://huggingface.co/tomjackson2023/rembg/resolve/cd3a3d6767a7859efea31ef0f2f373582cf06d82/u2netp.onnx";
const SIZE=320,MEAN=[.485,.456,.406],STD=[.229,.224,.225];
let busy=false;
export function saliencyInput(rgba){
 if(!(rgba instanceof Uint8ClampedArray)||rgba.length!==SIZE*SIZE*4)throw Error("MASK_INVALID");
 const n=SIZE*SIZE,out=new Float32Array(n*3);let max=0;
 for(let i=0;i<n;i++)for(let c=0;c<3;c++)max=Math.max(max,rgba[i*4+c]);
 if(!max)throw Error("MASK_AREA_INVALID");
 for(let i=0;i<n;i++)for(let c=0;c<3;c++)out[c*n+i]=(rgba[i*4+c]/max-MEAN[c])/STD[c];
 return out;
}
export function saliencyAlpha(values,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000||values.length!==w*h)throw Error("MASK_INVALID");
 let lo=Infinity,hi=-Infinity;
 for(const v of values){if(!Number.isFinite(v)||v<-.001||v>1.001)throw Error("MASK_INVALID");lo=Math.min(lo,v);hi=Math.max(hi,v);}
 if(hi-lo<.35||hi<.5)throw Error("MASK_CLEANUP_UNCERTAIN");
 const alpha=new Uint8ClampedArray(w*h);
 for(let i=0;i<alpha.length;i++){const v=(values[i]-lo)/(hi-lo);alpha[i]=v<=.08?0:v>=.92?255:Math.round((v-.08)/.84*255);}
 return validateMask({width:w,height:h,alpha,engine:"u2netp"});
}
export async function segmentSalient(canvas,load=()=>import(BASE+"ort.min.mjs")){
 if(busy)throw Error("VISION_BUSY");
 const w=canvas?.width,h=canvas?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
 busy=true;let timer,session,work,expired=false;const controller=new AbortController();
 const job=(async()=>{
  let ort;try{ort=await load();}catch{throw Error("VISION_LIBRARY_LOAD");}
  if(expired)throw Error("VISION_TIMEOUT");
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=BASE;
  const response=await fetch(MODEL,{signal:controller.signal});
  if(!response.ok)throw Error("VISION_MODEL_LOAD");
  const bytes=await response.arrayBuffer();if(bytes.byteLength<1000000||bytes.byteLength>8*1024*1024)throw Error("VISION_MODEL_LOAD");
  if(expired)throw Error("VISION_TIMEOUT");
  session=await ort.InferenceSession.create(bytes,{executionProviders:["wasm"]});
  if(expired)throw Error("VISION_TIMEOUT");
  work=document.createElement("canvas");work.width=work.height=SIZE;const ctx=work.getContext("2d");ctx.drawImage(canvas,0,0,SIZE,SIZE);
  const data=saliencyInput(ctx.getImageData(0,0,SIZE,SIZE).data);
  if(session.inputNames.length!==1||!session.outputNames.length)throw Error("VISION_MODEL_LOAD");
  const r=await session.run({[session.inputNames[0]]:new ort.Tensor("float32",data,[1,3,SIZE,SIZE])});
  if(expired)throw Error("VISION_TIMEOUT");
  const out=r[session.outputNames[0]],dims=out?.dims;
  if(!dims||dims.length!==4||dims[0]!==1||dims[1]!==1||dims[2]!==SIZE||dims[3]!==SIZE)throw Error("MASK_INVALID");
  const m=saliencyAlpha(out.data,SIZE,SIZE);
  const rgba=ctx.createImageData(SIZE,SIZE);for(let i=0;i<m.alpha.length;i++)rgba.data[i*4+3]=m.alpha[i];ctx.putImageData(rgba,0,0);
  const scaled=document.createElement("canvas");scaled.width=w;scaled.height=h;
  try{const sc=scaled.getContext("2d");sc.drawImage(work,0,0,w,h);const d=sc.getImageData(0,0,w,h).data,alpha=new Uint8ClampedArray(w*h);for(let i=0;i<alpha.length;i++)alpha[i]=d[i*4+3];return validateMask({width:w,height:h,alpha,engine:"u2netp"});}
  finally{scaled.width=scaled.height=1;}
 })().finally(async()=>{try{await session?.release();}finally{if(work)work.width=work.height=1;busy=false;}});
 try{return await Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;controller.abort();reject(Error("VISION_TIMEOUT"));},90000);})]);}finally{clearTimeout(timer);}
}
