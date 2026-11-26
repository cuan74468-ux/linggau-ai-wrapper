// Bounded confidence masks; no biometric matching or network.
export function validateMask(m){
 if(!m||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<1||m.height<1||m.width*m.height>600*600||!(m.alpha instanceof Uint8ClampedArray)||m.alpha.length!==m.width*m.height)throw Error("MASK_INVALID");
 let core=0,empty=0;
 for(const a of m.alpha){if(a===255)core++;if(a===0)empty++;}
 if(core<Math.max(1,m.alpha.length*.005)||empty<Math.max(1,m.alpha.length*.005))throw Error("MASK_AREA_INVALID");
 return m;
}
export function confidenceAlpha(data,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>600*600||data.length!==w*h)throw Error("MASK_INVALID");
 const alpha=new Uint8ClampedArray(data.length);
 for(let i=0;i<data.length;i++){const v=data[i];if(!Number.isFinite(v)||v<0||v>1)throw Error("MASK_INVALID");alpha[i]=v>=.82?255:v<=.18?0:Math.round((v-.18)/.64*255);}
 return validateMask({width:w,height:h,alpha});
}
export function brushMask(m,x,y,add,radius=.035){
 if(!m||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1||!Number.isFinite(radius)||radius<=0||radius>.2)throw Error("MASK_INVALID");
 const {width:w,height:h,alpha}=m, r=Math.max(2,Math.min(w,h)*radius), cx=x*(w-1),cy=y*(h-1);
 for(let yy=Math.max(0,Math.floor(cy-r));yy<=Math.min(h-1,Math.ceil(cy+r));yy++)for(let xx=Math.max(0,Math.floor(cx-r));xx<=Math.min(w-1,Math.ceil(cx+r));xx++){
  const d=Math.hypot(xx-cx,yy-cy);if(d>r)continue;
  const weight=Math.min(1,(r-d)/Math.max(1,r*.2)), i=yy*w+xx;
  alpha[i]=Math.round(add?alpha[i]+(255-alpha[i])*weight:alpha[i]*(1-weight));
 }
}
export function expandMask(m,w,h){
 validateMask(m);if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>4000000)throw Error("LOCAL_IMAGE_LIMIT");
 const a=new Uint8ClampedArray(w*h*4),sw=m.width,sh=m.height;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const fx=Math.max(0,Math.min(sw-1,(x+.5)*sw/w-.5)),fy=Math.max(0,Math.min(sh-1,(y+.5)*sh/h-.5));
  const ix=Math.floor(fx),iy=Math.floor(fy),jx=Math.min(sw-1,ix+1),jy=Math.min(sh-1,iy+1),dx=fx-ix,dy=fy-iy;
  const v=(m.alpha[iy*sw+ix]*(1-dx)+m.alpha[iy*sw+jx]*dx)*(1-dy)+(m.alpha[jy*sw+ix]*(1-dx)+m.alpha[jy*sw+jx]*dx)*dy;
  a[(y*w+x)*4+3]=Math.round(v);
 }
 return a;
}
// Optional shadow on background only. Interior pixels are copied by compositor afterwards.
export function contactBounds(source,mask,w,h){
 let x0=w,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4+3;if(source[i]>=250&&mask[i]>=250){x0=Math.min(x0,x);x1=Math.max(x1,x);y1=Math.max(y1,y);}}
 if(x1<=x0||y1<0||y1>=h-2)return null;
 return {x:(x0+x1)/2,y:y1,rx:Math.max(2,(x1-x0)*.48),ry:Math.max(2,Math.min(h*.035,(x1-x0)*.065))};
}

// Six semantic planes: background, hair, body skin, face skin, clothes, accessories.
// Use the combined person probability, not a single skin or hair class.
// Preserve high-confidence facial skin and fill only small enclosed gaps.
export function portraitAlpha(planes,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>360000||!Array.isArray(planes)||planes.length!==6||planes.some(p=>p.length!==w*h))throw Error("PORTRAIT_MASK_INVALID");
 const n=w*h,alpha=new Uint8ClampedArray(n);let face=0;
 for(let i=0;i<n;i++){
  let sum=0;for(const p of planes){const v=p[i];if(!Number.isFinite(v)||v<0||v>1)throw Error("PORTRAIT_MASK_INVALID");sum+=v;}
  if(sum<.85||sum>1.15)throw Error("PORTRAIT_MASK_INVALID");
  const fg=1-planes[0][i], skin=planes[3][i];
  // Keep confident face pixels fully opaque; never fill an arbitrary rectangle.
  if(skin>=.55&&fg>=.65){alpha[i]=255;face++;}
  else alpha[i]=fg>=.73?255:fg<=.16?0:Math.round((fg-.16)/.57*255);
 }
 // Fill tiny internal holes only: background connected to the frame is untouched.
 const seen=new Uint8Array(n),queue=new Int32Array(n),limit=Math.max(1,Math.floor(n*.003));
 for(let i=0;i<n;i++){
  if(seen[i]||alpha[i]>=128)continue;
  let head=0,tail=1,edge=false;queue[0]=i;seen[i]=1;
  while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);if(x===0||x===w-1||y===0||y===h-1)edge=true;
   const visit=j=>{if(!seen[j]&&alpha[j]<128){seen[j]=1;queue[tail++]=j;}};
   if(x>0)visit(k-1);if(x<w-1)visit(k+1);if(y>0)visit(k-w);if(y<h-1)visit(k+w);
  }
  if(!edge&&tail<=limit)for(let j=0;j<tail;j++)alpha[queue[j]]=255;
 }
 const result=validateMask({width:w,height:h,alpha});
 // For a visible face, count opaque semantic face pixels; this is not a
 // face detector or a proof that all facial features are present.
 return {...result,faceCorePixels:face};
}
