// Experimental product consensus. Do not expose until annotated QA passes.
import {validateMask} from "./vision-mask.js";
import {segmentProduct} from "./product-engine.js";
import {segmentSalient} from "./product-saliency.js";

import {interiorSeed} from "./product-seed.js";
export {interiorSeed} from "./product-seed.js";
export function productConsensus(salient,interactive){
 validateMask(salient);validateMask(interactive);
 if(salient.width!==interactive.width||salient.height!==interactive.height)throw Error("MASK_INVALID");
 let s=0,m=0,both=0;
 for(let i=0;i<salient.alpha.length;i++){const a=salient.alpha[i]>=128,b=interactive.alpha[i]>=128;if(a)s++;if(b)m++;if(a&&b)both++;}
 const iou=both/(s+m-both);
 // Agreement is only a guard, not an accuracy estimate; a mask may still be wrong.
 if(!s||!m||iou<.65||both/s<.72||both/m<.72)throw Error("MASK_CLEANUP_UNCERTAIN");
 const alpha=new Uint8ClampedArray(salient.alpha.length);
 for(let i=0;i<alpha.length;i++){
  const a=salient.alpha[i],b=interactive.alpha[i];
  // Keep interactive edge detail, attenuating it only where independent
  // saliency predicts almost no foreground. Never grow it into background.
  alpha[i]=a<24&&b<240?Math.round(b*a/24):b;
 }
 return {...validateMask({width:salient.width,height:salient.height,alpha}),engine:"product-consensus",agreement:iou};
}
export async function segmentProductConsensus(canvas,{saliency=segmentSalient,interactive=segmentProduct,knownSaliency=null}={}){
 const a=knownSaliency||await saliency(canvas),point=interiorSeed(a);
 const b=await interactive(canvas,{point});
 return {seed:point,interactive:b,combined:productConsensus(a,b)};
}
