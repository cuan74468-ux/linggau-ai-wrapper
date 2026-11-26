import {validateMask} from "./vision-mask.js";
const distance=(rgb,i,j)=>Math.max(Math.abs(rgb[i*4]-rgb[j*4]),Math.abs(rgb[i*4+1]-rgb[j*4+1]),Math.abs(rgb[i*4+2]-rgb[j*4+2]));
function neighbours(i,w,h,fn){const x=i%w,y=Math.floor(i/w);if(x)fn(i-1);if(x<w-1)fn(i+1);if(y)fn(i-w);if(y<h-1)fn(i+w);}
function checkRGB(rgb,w,h){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000||!(rgb instanceof Uint8ClampedArray)||rgb.length!==w*h*4)throw Error("MASK_INVALID");}
// Confidence-aware, position-independent cleanup. Strong foreground never removed.
// Border connectivity by itself is not evidence of background.
export function refineMask(mask,rgb){
 const {width:w,height:h,alpha}=validateMask(mask);checkRGB(rgb,w,h);
 const n=w*h,out=alpha.slice(),seen=new Uint8Array(n),queue=new Int32Array(n);
 let head=0,tail=0,removed=0,originalMass=0;
 for(let i=0;i<n;i++){originalMass+=alpha[i];if(alpha[i]<=8){seen[i]=1;queue[tail++]=i;}}
 // Grow known background into weak, locally similar pixels only.
 while(head<tail){const i=queue[head++];neighbours(i,w,h,j=>{
  if(seen[j]||alpha[j]>112||distance(rgb,i,j)>24)return;
  if(alpha[j]>8){
   const x=j%w,y=Math.floor(j/w);let nearCore=false;
   for(let yy=Math.max(0,y-2);yy<=Math.min(h-1,y+2)&&!nearCore;yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(w-1,x+2);xx++){const k=yy*w+xx;if(alpha[k]>=240&&distance(rgb,j,k)<=24){nearCore=true;break;}}
   if(nearCore)return;
  }
  seen[j]=1;queue[tail++]=j;removed+=out[j];out[j]=0;
 });}
 // Remove weak detached islands with no connection to a confident foreground.
 seen.fill(0);head=0;tail=0;
 for(let i=0;i<n;i++)if(out[i]>=240){seen[i]=1;queue[tail++]=i;}
 while(head<tail){const i=queue[head++];neighbours(i,w,h,j=>{if(!seen[j]&&out[j]>=24){seen[j]=1;queue[tail++]=j;}});}
 for(let i=0;i<n;i++)if(!seen[i]&&out[i]>0&&out[i]<=112){removed+=out[i];out[i]=0;}
 // Fail closed if cleanup is surprisingly aggressive; do not silently strip the subject.
 if(removed>originalMass*.18)throw Error("MASK_CLEANUP_UNCERTAIN");
 const refined=validateMask({...mask,alpha:out});
 return {...refined,cleanupRemovedMass:removed,cleanupOriginalMass:originalMass};
}
// Automatic point for a foreground against a reasonably uniform perimeter.
// A point is only a seed for the interactive model, not the resulting mask.
export function findObjectSeed(rgb,w,h){
 checkRGB(rgb,w,h);const n=w*h;if(w<8||h<8)return null;
 const border=[];for(let x=0;x<w;x++){border.push(x,(h-1)*w+x);}for(let y=1;y<h-1;y++)border.push(y*w,y*w+w-1);
 const med=[0,1,2].map(c=>{const a=border.map(i=>rgb[4*i+c]).sort((a,b)=>a-b);return a[Math.floor(a.length/2)];});
 const d=i=>Math.max(...med.map((v,c)=>Math.abs(v-rgb[i*4+c])));
 if(border.filter(i=>d(i)<=35).length<border.length*.7)return null;
 const eligible=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n);
 for(let i=0;i<n;i++)if(d(i)>=45&&rgb[4*i+3]>=240)eligible[i]=1;
 let best=[],second=0;
 for(let i=0;i<n;i++){if(!eligible[i]||seen[i])continue;let head=0,tail=1;queue[0]=i;seen[i]=1;
  while(head<tail){const k=queue[head++];neighbours(k,w,h,j=>{if(eligible[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}});}
  if(tail>best.length){second=best.length;best=Array.from(queue.subarray(0,tail));}else second=Math.max(second,tail);
 }
 if(best.length<n*.025||best.length>n*.8||second>best.length*.7)return null;
 // Select an interior point, not the bounding-box center (which may be empty).
 const member=new Uint8Array(n);let sx=0,sy=0;for(const k of best){member[k]=1;sx+=k%w;sy+=Math.floor(k/w);}
 const cx=sx/best.length,cy=sy/best.length;let chosen=-1,score=Infinity;
 for(const k of best){const x=k%w,y=Math.floor(k/w);if(x===0||x===w-1||y===0||y===h-1||!member[k-1]||!member[k+1]||!member[k-w]||!member[k+w])continue;const s=(x-cx)**2+(y-cy)**2;if(s<score){chosen=k;score=s;}}
 return chosen<0?null:{x:((chosen%w)+.5)/w,y:(Math.floor(chosen/w)+.5)/h};
}
