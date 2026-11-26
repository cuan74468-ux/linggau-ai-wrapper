// Portrait alpha matting pilot. Only model files are fetched; RGB stays local.
import {validateMask} from "./vision-mask.js";
const LIB="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const MODEL="Xenova/modnet", REVISION="6cf7b7f71400dc891fa3f2cb90b1e3709f3ca207";
let busy=false;
export function matteAlpha(data,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>1024*1024||data.length!==w*h)throw Error("PORTRAIT_MASK_INVALID");
 const a=new Uint8ClampedArray(w*h);
 for(let i=0;i<a.length;i++){const v=data[i];if(!Number.isFinite(v)||v<-.001||v>1.001)throw Error("PORTRAIT_MASK_INVALID");a[i]=v<=.04?0:v>=.96?255:Math.round(v*255);}
 return a;
}
export async function segmentPortraitMatte(canvas,load=()=>import(LIB)){
 if(busy)throw Error("VISION_BUSY");
 const w=canvas?.width,h=canvas?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
 busy=true;let timer,model,expired=false;
 const task=(async()=>{
  let lib;try{lib=await load();}catch{throw Error("VISION_LIBRARY_LOAD");}
  const {env,AutoModel,AutoProcessor,RawImage}=lib;
  if(expired)throw Error("VISION_TIMEOUT");
  env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;env.backends.onnx.wasm.proxy=false;
  try{model=await AutoModel.from_pretrained(MODEL,{revision:REVISION,device:"wasm",dtype:"fp32"});
   if(expired)throw Error("VISION_TIMEOUT");
   const processor=await AutoProcessor.from_pretrained(MODEL,{revision:REVISION});
   if(expired)throw Error("VISION_TIMEOUT");
   // Bound aspect ratio for preprocessing without stretching source. Model sees
   // a square of at most 512 pixels; original framing is restored afterwards.
   const side=Math.max(w,h),work=document.createElement("canvas");work.width=work.height=side;
   const ctx=work.getContext("2d");ctx.fillStyle="#808080";ctx.fillRect(0,0,side,side);
   const x=Math.floor((side-w)/2),y=Math.floor((side-h)/2);ctx.drawImage(canvas,x,y);
   const rgba=ctx.getImageData(0,0,side,side).data,rgb=new Uint8ClampedArray(side*side*3);
   for(let i=0,j=0;i<rgba.length;i+=4,j+=3){rgb[j]=rgba[i];rgb[j+1]=rgba[i+1];rgb[j+2]=rgba[i+2];}
   const {pixel_values}=await processor(new RawImage(rgb,side,side,3));
   if(expired)throw Error("VISION_TIMEOUT");
   const {output}=await model({input:pixel_values});
   if(expired)throw Error("VISION_TIMEOUT");
   const dims=output?.dims||[],mh=dims.at(-2),mw=dims.at(-1);
   if(!output?.data||dims.length!==4||dims[0]!==1||dims[1]!==1)throw Error("PORTRAIT_MASK_INVALID");
   const a=matteAlpha(output.data,mw,mh);
   const sample=(sx,sy)=>{const fx=Math.max(0,Math.min(mw-1,(sx+.5)*mw/side-.5)),fy=Math.max(0,Math.min(mh-1,(sy+.5)*mh/side-.5)),ix=Math.floor(fx),iy=Math.floor(fy),jx=Math.min(mw-1,ix+1),jy=Math.min(mh-1,iy+1),dx=fx-ix,dy=fy-iy;return (a[iy*mw+ix]*(1-dx)+a[iy*mw+jx]*dx)*(1-dy)+(a[jy*mw+ix]*(1-dx)+a[jy*mw+jx]*dx)*dy;};
   const alpha=new Uint8ClampedArray(w*h);
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)alpha[yy*w+xx]=sample(xx+x,yy+y);
   work.width=work.height=1;
   console.info("LINGGAU_PORTRAIT_MATTE_OK",w,h);
   return validateMask({width:w,height:h,alpha,engine:"modnet"});
  }catch(e){if(/^(VISION_|PORTRAIT_|MASK_)/.test(String(e?.message)))throw e;console.warn("LINGGAU_MATTE_FAILED",e?.name||"Error",String(e?.message||"").slice(0,150));throw Error("VISION_MATTE_FAILED");}
 })().finally(async()=>{try{await model?.dispose?.();}finally{busy=false;}});
 try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error("VISION_TIMEOUT"));},120000);})]);}finally{clearTimeout(timer);}
}
