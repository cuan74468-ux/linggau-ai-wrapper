// Shared actual local product pipeline. User point overrides automatic selection.
import {segmentObject} from "./vision.js";
import {findObjectSeed,refineMask} from "./mask-refinement.js";
import {validateMask,expandMask} from "./vision-mask.js";
import {segmentSalient} from "./product-saliency.js";
import {interiorSeed} from "./product-seed.js";
import {refineProductEdges} from "./product-edge.js";
function align(mask,w,h){
 validateMask(mask);
 if(mask.width===w&&mask.height===h)return mask;
 const rgba=expandMask(mask,w,h),alpha=new Uint8ClampedArray(w*h);
 for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
 return validateMask({...mask,width:w,height:h,alpha});
}
export async function segmentProduct(canvas,{point=null,segment=segmentObject,saliency=segmentSalient,onStage=()=>{}}={}){
 const w=canvas?.width,h=canvas?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
 const rgb=canvas.getContext("2d").getImageData(0,0,w,h).data;
 let seed=point||findObjectSeed(rgb,w,h),prior=null;
 if(!seed){
  onStage("Mencari objek utama…");
  prior=align(await saliency(canvas),w,h);seed=interiorSeed(prior);
 }
 onStage("Memisahkan objek dari latar…");
 const m=align(await segment(canvas,seed),w,h);
 if(prior){
  let a=0,b=0,both=0;
  for(let i=0;i<m.alpha.length;i++){const x=prior.alpha[i]>=128,y=m.alpha[i]>=128;if(x)a++;if(y)b++;if(x&&y)both++;}
  // Agreement is a refusal guard, not a claim of segmentation accuracy.
  if(!a||!b||both/(a+b-both)<.65||both/a<.72||both/b<.72)throw Error("MASK_CLEANUP_UNCERTAIN");
 }
 return {...refineProductEdges(refineMask(m,rgb),rgb),engine:prior?"product-saliency-seeded":"product-interactive"};
}
