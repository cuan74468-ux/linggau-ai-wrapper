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
   if(m===0)editablePixels++;
 }
 if(!protectedPixels||!editablePixels)throw Error("MASK_AREA_INVALID");
 return {pixels:out,protectedPixels,editablePixels};
}
