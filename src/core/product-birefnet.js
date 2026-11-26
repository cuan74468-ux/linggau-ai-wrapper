// Experimental foreground matte, not imported by the user workspace.
// Source: studioludens/birefnet-lite-512, MIT model card, immutable FP32 export.
import {validateMask,expandMask} from "./vision-mask.js";
import {refineProductEdges} from "./product-edge.js";
const BASE="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
const MODEL="https://huggingface.co/studioludens/birefnet-lite-512/resolve/18d56c586d2b29bb33a1a38a3a8bdaeec5c08e36/onnx/model.onnx";
const HASH="1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2";
const SIZE=512,N=SIZE*SIZE,MEAN=[.485,.456,.406],STD=[.229,.224,.225];
export function productMatteInput(rgba){
 if(!(rgba instanceof Uint8ClampedArray)||rgba.length!==N*4)throw Error("MASK_INVALID");
 const data=new Float32Array(N*3);
 for(let i=0;i<N;i++)for(let c=0;c<3;c++)data[c*N+i]=(rgba[i*4+c]/255-MEAN[c])/STD[c];
 return data;
}
export function productMatteAlpha(logits){
 if(logits.length!==N)throw Error("MASK_INVALID");
 const alpha=new Uint8ClampedArray(N);
 for(let i=0;i<N;i++){if(!Number.isFinite(logits[i]))throw Error("MASK_INVALID");const p=1/(1+Math.exp(-logits[i]));alpha[i]=p<=.04?0:p>=.96?255:Math.round(p*255);}
 return validateMask({width:SIZE,height:SIZE,alpha});
}
// One session reused only by a bounded benchmark, released by the caller.
export async function openProductMatte(){
 const ort=await import(BASE+"ort.min.mjs");
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=BASE;
 const response=await fetch(MODEL,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error("VISION_MODEL_LOAD");
 const bytes=await response.arrayBuffer();
 if(bytes.byteLength<180000000||bytes.byteLength>210000000)throw Error("VISION_MODEL_LOAD");
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
 if(digest!==HASH)throw Error("VISION_MODEL_INTEGRITY");
 const session=await ort.InferenceSession.create(bytes,{executionProviders:["wasm"]});
 let closed=false,busy=false;
 return {async segment(canvas){
  if(closed||busy)throw Error("VISION_BUSY");
  const w=canvas?.width,h=canvas?.height;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
  busy=true;const work=document.createElement("canvas");work.width=work.height=SIZE;
  try{
   const ctx=work.getContext("2d");ctx.drawImage(canvas,0,0,SIZE,SIZE);
   const input=new ort.Tensor("float32",productMatteInput(ctx.getImageData(0,0,SIZE,SIZE).data),[1,3,SIZE,SIZE]);
   if(session.inputNames.length!==1||session.inputNames[0]!=="input_image"||session.outputNames.length!==1)throw Error("VISION_MODEL_LOAD");
   const result=await session.run({input_image:input}),out=result[session.outputNames[0]];
   if(!out||out.dims.join(",")!=="1,1,512,512")throw Error("MASK_INVALID");
   const rgba=expandMask(productMatteAlpha(out.data),w,h),alpha=new Uint8ClampedArray(w*h);
   for(let i=0;i<alpha.length;i++)alpha[i]=rgba[4*i+3];
   return {...refineProductEdges(validateMask({width:w,height:h,alpha}),canvas.getContext("2d").getImageData(0,0,w,h).data),engine:"birefnet-lite-512"};
  }finally{work.width=work.height=1;busy=false;}
 },async close(){if(!closed&&!busy){closed=true;await session.release();}}};
}
