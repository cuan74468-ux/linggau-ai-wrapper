// Conservative color heuristic for separated opaque products on a flat backdrop.
// Not semantic recognition; uncertain cases fall back to the existing model.
import {validateMask} from "./vision-mask.js";
export function flatCatalogMask(rgb,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<32||h<32||w*h>360000||!(rgb instanceof Uint8ClampedArray)||rgb.length!==w*h*4)return null;
 const n=w*h,border=[];
 for(let x=0;x<w;x++)border.push(x,(h-1)*w+x);
 for(let y=1;y<h-1;y++)border.push(y*w,y*w+w-1);
 const bg=[0,1,2].map(c=>{const v=border.map(i=>rgb[4*i+c]).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];});
 const diff=new Uint8Array(n);
 for(let i=0;i<n;i++){if(rgb[4*i+3]!==255)return null;diff[i]=Math.max(Math.abs(rgb[4*i]-bg[0]),Math.abs(rgb[4*i+1]-bg[1]),Math.abs(rgb[4*i+2]-bg[2]));}
 if(border.some(i=>diff[i]>8))return null;
 const background=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
 function visit(i,fn){const x=i%w,y=Math.floor(i/w);if(x>0)fn(i-1);if(x+1<w)fn(i+1);if(y>0)fn(i-w);if(y+1<h)fn(i+w);}
 function seed(i){if(!background[i]&&diff[i]<=16){background[i]=1;queue[tail++]=i;}}
 for(const i of border)seed(i);
 while(head<tail)visit(queue[head++],seed);
 if(tail<n*.25||tail>n*.95)return null;
 // Border-connected color removal preserves enclosed label areas, but
 // cannot distinguish a real enclosed hole from a same-color label.
 const seen=background.slice(),alpha=new Uint8ClampedArray(n);let count=0,foreground=0,weak=0;
 for(let i=0;i<n;i++){
  if(seen[i])continue;
  head=0;tail=1;queue[0]=i;seen[i]=1;let strong=0;
  while(head<tail){const k=queue[head++];if(diff[k]>=48)strong++;visit(k,j=>{if(!seen[j]){seen[j]=1;queue[tail++]=j;}});}
  if(tail<Math.max(16,n*.005)||strong<tail*.65)return null;
  count++;foreground+=tail;if(count>6)return null;
  for(let j=0;j<tail;j++){
   const k=queue[j];let edge=false;visit(k,v=>{if(background[v])edge=true;});
   if(edge&&diff[k]<48){weak++;alpha[k]=Math.round((diff[k]-16)*255/32);}
   else alpha[k]=255;
  }
 }
 if(count<2||!foreground||weak>foreground*.08)return null;
 return {...validateMask({width:w,height:h,alpha}),engine:"product-flat-catalog",components:count};
}
