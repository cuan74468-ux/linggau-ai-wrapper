import {validateMask} from "./vision-mask.js";
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
