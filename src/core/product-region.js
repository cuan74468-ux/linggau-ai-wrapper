// Optional user-targeted region. All output coordinates remain in the source frame.
// A rectangular area is an inference hint, not a guarantee of object boundaries.
import {segmentProduct} from "./product-engine.js";
import {validateMask,expandMask} from "./vision-mask.js";
export function regionBounds(w,h,first,second){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000||![first,second].every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))throw Error("MASK_INVALID");
 const x=Math.floor(Math.min(first.x,second.x)*w),y=Math.floor(Math.min(first.y,second.y)*h);
 const right=Math.ceil(Math.max(first.x,second.x)*w),bottom=Math.ceil(Math.max(first.y,second.y)*h);
 if(right-x<8||bottom-y<8)throw Error("OBJECT_REGION_SMALL");
 const pad=Math.max(2,Math.round(Math.min(right-x,bottom-y)*.1));
 const left=Math.max(0,x-pad),top=Math.max(0,y-pad),r=Math.min(w,right+pad),b=Math.min(h,bottom+pad);
 return {x:left,y:top,width:r-left,height:b-top};
}
export function restoreRegion(mask,w,h,r){
 validateMask(mask);
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000||![r.x,r.y,r.width,r.height].every(Number.isInteger)||r.x<0||r.y<0||r.width<1||r.height<1||r.x+r.width>w||r.y+r.height>h)throw Error("MASK_INVALID");
 const rgba=expandMask(mask,r.width,r.height),alpha=new Uint8ClampedArray(w*h);
 for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)alpha[(y+r.y)*w+x+r.x]=rgba[(y*r.width+x)*4+3];
 return validateMask({width:w,height:h,alpha,engine:"product-target-region"});
}
export async function segmentProductRegion(canvas,first,second,{segment=segmentProduct,createCanvas=()=>document.createElement("canvas")}={}){
 const w=canvas?.width,h=canvas?.height,r=regionBounds(w,h,first,second),crop=createCanvas();
 crop.width=r.width;crop.height=r.height;
 try{
  crop.getContext("2d").drawImage(canvas,r.x,r.y,r.width,r.height,0,0,r.width,r.height);
  const center={x:((first.x+second.x)*w/2-r.x)/r.width,y:((first.y+second.y)*h/2-r.y)/r.height};
  return restoreRegion(await segment(crop,{point:center}),w,h,r);
 }finally{crop.width=crop.height=1;}
}
