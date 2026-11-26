// Experimental product consensus. Do not expose until annotated QA passes.
import {validateMask} from "./vision-mask.js";
import {segmentProduct} from "./product-engine.js";
import {segmentSalient} from "./product-saliency.js";

// Select a point far inside confident foreground, not the image centre or
// centre of its bounding box (which can fall on background in concave shapes).
export function interiorSeed(mask){
 const {width:w,height:h,alpha}=validateMask(mask),n=w*h;
 const d=new Int32Array(n).fill(-1),q=new Int32Array(n);let head=0,tail=0;
 for(let i=0;i<n;i++)if(alpha[i]<192){d[i]=0;q[tail++]=i;}
 while(head<tail){const i=q[head++],x=i%w,y=Math.floor(i/w);
  const visit=j=>{if(d[j]<0){d[j]=d[i]+1;q[tail++]=j;}};
  if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);
 }
 let best=-1,score=-1;
 for(let i=0;i<n;i++){const x=i%w,y=Math.floor(i/w);if(alpha[i]<192||d[i]<2||x===0||x===w-1||y===0||y===h-1)continue;
  const s=d[i]+alpha[i]/256;if(s>score){score=s;best=i;}}
 if(best<0)throw Error("OBJECT_SEED_UNCERTAIN");
 return {x:(best%w+.5)/w,y:(Math.floor(best/w)+.5)/h};
}
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
