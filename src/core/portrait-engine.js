// One local portrait pipeline, shared by runtime and quality benchmark.
import {segmentPerson} from "./vision.js";
import {segmentPortraitMatte} from "./portrait-matting.js";
import {combinePortraitMasks} from "./portrait-consensus.js";
import {refineMask} from "./mask-refinement.js";
import {expandMask,validateMask} from "./vision-mask.js";
function align(mask,w,h){
 validateMask(mask);
 if(mask.width===w&&mask.height===h)return mask;
 const rgba=expandMask(mask,w,h),alpha=new Uint8ClampedArray(w*h);
 for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
 return validateMask({...mask,width:w,height:h,alpha});
}
export async function portraitLayers(canvas,{semantic=segmentPerson,matting=segmentPortraitMatte,onStage=()=>{}}={}){
 const w=canvas?.width,h=canvas?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
 const rgb=canvas.getContext("2d").getImageData(0,0,w,h).data;
 onStage("Memisahkan orang dari latar…");
 const base=refineMask(align(await semantic(canvas),w,h),rgb);
 onStage("Merapikan tepi rambut dan wajah…");
 const matte=align(await matting(canvas),w,h);
 const combined=combinePortraitMasks(base,matte);
 return {base,matte,combined};
}
export async function segmentPortrait(canvas,options){return (await portraitLayers(canvas,options)).combined;}
