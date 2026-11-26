// Deterministic decoded-RGBA processing. No inference, identity detection or external model.
export const LOCAL_MAX_PIXELS=4000000;
export function validateDimensions(w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>LOCAL_MAX_PIXELS||w>4096||h>4096)throw Error("LOCAL_IMAGE_LIMIT");
}
function check(data,w,h){validateDimensions(w,h);if(!(data instanceof Uint8ClampedArray)||data.length!==w*h*4)throw Error("PIXEL_BUFFER_INVALID");}
const lum=(d,i)=>(77*d[i]+150*d[i+1]+29*d[i+2])/256;
export function sharpenPixels(source,w,h,values){
 check(source,w,h);
 const gain={Ringan:.35,Sedang:.65,Kuat:.95}[values.strength],noise={Minimal:0,Sedang:.16,Kuat:.28}[values.noise],threshold={Seimbang:5,"Tekstur objek":3,"Tulisan dan tepi":9}[values.detail];
 if(gain===undefined||noise===undefined||threshold===undefined)throw Error("INVALID_PARAMETER");
 const out=new Uint8ClampedArray(source);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=(y*w+x)*4;if(source[i+3]!==255)continue;
   let sum=0,n=0,lo=255,hi=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const j=i+(dy*w+dx)*4;if(source[j+3]!==255)continue;
     const l=lum(source,j);sum+=l;n++;lo=Math.min(lo,l);hi=Math.max(hi,l);
   }
   if(n!==9)continue;
   const l=lum(source,i),delta=l-sum/n,abs=Math.abs(delta);
   const shift=abs>=threshold?Math.max(-22,Math.min(22,delta*gain)):(hi-lo<24?-delta*noise:0);
   // Add the same luminance correction to channels; keep hue differences and alpha where possible.
   const bounded=Math.max(-Math.min(source[i],source[i+1],source[i+2]),Math.min(255-Math.max(source[i],source[i+1],source[i+2]),shift));
   for(let c=0;c<3;c++)out[i+c]=source[i+c]+bounded;
 }
 return out;
}
export function validPolygon(points){
 if(!Array.isArray(points)||points.length<3||points.length>300||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1)))return false;
 let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
 return Math.abs(area)>0.0001;
}
export function compositePixels(source,background,mask,w,h){
 check(source,w,h);check(background,w,h);
 if(!(mask instanceof Uint8ClampedArray)||mask.length!==source.length)throw Error("MASK_INVALID");
 const out=new Uint8ClampedArray(source.length);let protectedPixels=0,editablePixels=0;
 for(let i=0;i<source.length;i+=4){
   if(background[i+3]!==255)throw Error("BACKGROUND_NOT_OPAQUE");
   const m=mask[i+3],a=source[i+3]*m/(255*255);
   if(m===255&&source[i+3]===255){out.set(source.subarray(i,i+4),i);protectedPixels++;}
   else{for(let c=0;c<3;c++)out[i+c]=Math.round(source[i+c]*a+background[i+c]*(1-a));out[i+3]=255;}
   if(m===0||source[i+3]===0)editablePixels++;
 }
 if(!protectedPixels||!editablePixels)throw Error("MASK_AREA_INVALID");
 return {pixels:out,protectedPixels,editablePixels};
}

 // Alpha-aware cutout: preserve the source alpha instead of multiplying it by itself.
export function existingAlphaMask(source,w,h){
 check(source,w,h);
 const mask=new Uint8ClampedArray(source.length);let opaque=0,empty=0;
 for(let i=3;i<source.length;i+=4){mask[i]=255;if(source[i]===255)opaque++;if(source[i]===0)empty++;}
 if(!opaque||!empty)throw Error("ALPHA_MASK_UNAVAILABLE");
 return {mask,opaque,empty};
}
export function transparentPixels(source,mask,w,h){
 check(source,w,h);if(!(mask instanceof Uint8ClampedArray)||mask.length!==source.length)throw Error("MASK_INVALID");
 const out=new Uint8ClampedArray(source.length);let protectedPixels=0,editablePixels=0;
 for(let i=0;i<source.length;i+=4){
  const a=Math.round(source[i+3]*mask[i+3]/255);
  if(a){out[i]=source[i];out[i+1]=source[i+1];out[i+2]=source[i+2];out[i+3]=a;}
  else editablePixels++;
  if(a===255)protectedPixels++;
 }
 if(!protectedPixels||!editablePixels)throw Error("MASK_AREA_INVALID");
 return {pixels:out,protectedPixels,editablePixels};
}
export function countPixelChanges(expected,actual,source,mask,w,h){
 check(expected,w,h);check(actual,w,h);check(source,w,h);
 if(!(mask instanceof Uint8ClampedArray)||mask.length!==source.length)throw Error("MASK_INVALID");
 let protectedPixels=0,changed=0;
 for(let i=0;i<source.length;i+=4)if(source[i+3]===255&&mask[i+3]===255){
  protectedPixels++;
  for(let j=0;j<4;j++)if(expected[i+j]!==source[i+j]||actual[i+j]!==source[i+j]){changed++;break;}
 }
 return {protectedPixels,changed};
}

// Estimate edge foreground colour from nearby opaque foreground and background.
// Only partial-alpha pixels can change. Keep source RGBA and opaque core immutable.
export function cleanEdgeColors(source,mask,w,h){
 check(source,w,h);if(!(mask instanceof Uint8ClampedArray)||mask.length!==source.length)throw Error("MASK_INVALID");
 const out=new Uint8ClampedArray(source.length);out.set(source);
 const radii=[1,3,6,12].filter(r=>r<=Math.max(1,Math.round(Math.min(w,h)*.04)));
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,m=mask[i+3];if(m<24||m>230||source[i+3]!==255)continue;
  let f=-1,b=-1;
  for(const r of radii){for(const [dx,dy] of dirs){const xx=x+dx*r,yy=y+dy*r;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=(yy*w+xx)*4;if(f<0&&mask[j+3]===255&&source[j+3]===255)f=j;if(b<0&&mask[j+3]===0&&source[j+3]===255)b=j;}if(f>=0&&b>=0)break;}
  if(f<0||b<0)continue;
  const a=m/255;let contrast=0,residual=0,fromF=0;
  for(let c=0;c<3;c++){contrast=Math.max(contrast,Math.abs(source[f+c]-source[b+c]));residual=Math.max(residual,Math.abs(source[i+c]-(a*source[f+c]+(1-a)*source[b+c])));fromF=Math.max(fromF,Math.abs(source[i+c]-source[f+c]));}
  if(contrast<40||residual>22||fromF<12)continue;
  for(let c=0;c<3;c++){const recovered=(source[i+c]-(1-a)*source[b+c])/a;const delta=Math.max(-45,Math.min(45,recovered-source[i+c]));out[i+c]=source[i+c]+delta;}
 }
 return out;
}
