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
