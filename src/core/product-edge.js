// Local edge refinement: only ambiguous pixels near both foreground and background
// are changed. Confident opaque pixels (including label detail) remain untouched.
import {validateMask} from "./vision-mask.js";
export function refineProductEdges(mask,rgb){
 const {width:w,height:h,alpha}=validateMask(mask),n=w*h;
 if(!(rgb instanceof Uint8ClampedArray)||rgb.length!==n*4)throw Error("MASK_INVALID");
 const out=alpha.slice();
 for(let i=0;i<n;i++){
  if(alpha[i]<=8||alpha[i]>=240)continue;
  const x=i%w,y=Math.floor(i/w);let fg=Infinity,bg=Infinity;
  for(let yy=Math.max(0,y-3);yy<=Math.min(h-1,y+3);yy++)for(let xx=Math.max(0,x-3);xx<=Math.min(w-1,x+3);xx++){
   const j=yy*w+xx,a=alpha[j];if(a>8&&a<240)continue;
   const d=Math.abs(rgb[4*i]-rgb[4*j])+Math.abs(rgb[4*i+1]-rgb[4*j+1])+Math.abs(rgb[4*i+2]-rgb[4*j+2])+4*(Math.abs(xx-x)+Math.abs(yy-y));
   if(a>=240)fg=Math.min(fg,d);else bg=Math.min(bg,d);
  }
  if(!Number.isFinite(fg)||!Number.isFinite(bg)||Math.abs(fg-bg)<36)continue;
  if(fg+36<bg&&alpha[i]>=96)out[i]=Math.max(alpha[i],Math.min(255,alpha[i]+64));
  else if(bg+36<fg&&alpha[i]<=160)out[i]=Math.min(alpha[i],Math.max(0,alpha[i]-64));
 }
 return validateMask({...mask,alpha:out});
}
