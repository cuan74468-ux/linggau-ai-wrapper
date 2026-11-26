// Shared product pipeline: real interactive segmentation, never fabricate pixels.
import {segmentObject} from "./vision.js";
import {findObjectSeed,refineMask} from "./mask-refinement.js";
import {validateMask} from "./vision-mask.js";
export async function segmentProduct(canvas,{point=null,segment=segmentObject}={}){
 const w=canvas?.width,h=canvas?.height;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000)throw Error("MASK_INVALID");
 const rgb=canvas.getContext("2d").getImageData(0,0,w,h).data;
 const seed=point||findObjectSeed(rgb,w,h);
 if(!seed)throw Error("OBJECT_SEED_UNCERTAIN");
 const m=validateMask(await segment(canvas,seed));
 let data=rgb;if(m.width!==w||m.height!==h){const r=document.createElement("canvas");r.width=m.width;r.height=m.height;try{const ctx=r.getContext("2d");ctx.drawImage(canvas,0,0,m.width,m.height);data=ctx.getImageData(0,0,m.width,m.height).data;}finally{r.width=r.height=1;}}
 return {...refineMask(m,data),engine:"product-interactive"};
}
