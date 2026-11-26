import {validateMask} from "./vision-mask.js";
// MODNet supplies detailed opacity. The semantic model supplies corroborating
// evidence. Reduce weak/moderate matte spill in strongly classified background.
// Never promote an alpha value merely because an old segmentation was opaque.
export function combinePortraitMasks(semantic,matte){
 validateMask(semantic);validateMask(matte);
 if(semantic.width!==matte.width||semantic.height!==matte.height)throw Error("PORTRAIT_MASK_INVALID");
 const n=matte.alpha.length,alpha=new Uint8ClampedArray(n);
 let oldCore=0,removed=0,matteCore=0,added=0;
 for(let i=0;i<n;i++){
  const s=semantic.alpha[i],m=matte.alpha[i];
  if(s>=240){oldCore++;if(m<128)removed++;}
  if(m>=240){matteCore++;if(s<128)added++;}
  // Keep the dedicated model's confident core; use the independent semantic
  // evidence to attenuate ambiguous opacity, without hard cropping its edge.
  const support=s/255;
  const confidence=Math.max(0,Math.min(1,(m-128)/112));
  const weight=Math.max(support,confidence);
  alpha[i]=m>=240?m:Math.round(m*weight);
 }
 if(!oldCore||!matteCore||removed/oldCore>.25||added/matteCore>.25)throw Error("MASK_CLEANUP_UNCERTAIN");
 return {...validateMask({width:matte.width,height:matte.height,alpha}),engine:"portrait-consensus"};
}
