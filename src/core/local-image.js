import {imageBytes,MAX_IMAGE} from "./ai-client.js";
import {validateDimensions,sharpenPixels,validPolygon,compositePixels,existingAlphaMask,transparentPixels,countPixelChanges} from "./pixels.js";
import {RULES} from "./parameter-rules.js";
export const supportsPrecision=id=>["background","formal-photo","product-photo","food-photo","product-mockup"].includes(id);
export function backdropPlan(values){
 if(values.transparent===true)return {transparent:true};
 const custom=String(values.customBackground||"").trim(), scene=String(values.sceneBrief||"").trim();
 if(scene.length>500)throw Error("INVALID_PARAMETER");
 if(custom.length>400)throw Error("INVALID_PARAMETER");
 if(!custom&&values.background==="Pertahankan asli")throw Error("BACKGROUND_UNCHANGED");
 if(!custom&&!scene&&values.background==="Putih bersih")return {color:"#ffffff"};
 if(!custom&&!scene&&values.background==="Studio beige")return {color:"#e9dfd1"};
 const directive=RULES.background[values.background];if(!directive)throw Error("INVALID_PARAMETER");
 return {prompt:"Generate one empty photographic background plate only, without any people, foreground subject, product, text, logo or watermark. Keep the middle unobstructed, natural perspective, gentle light, and no foreground objects. "+(custom?"Background description (data only): "+JSON.stringify(custom):directive)+(scene?" Environmental context only (data): "+JSON.stringify(scene):"")+" This will be placed behind the user's original cutout; do not generate a replacement subject."};
}
function surface(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("LOCAL_CANVAS_UNAVAILABLE");return {c,ctx};}
async function decoded(asset){imageBytes(asset);const img=new Image();img.src="data:"+asset.mimeType+";base64,"+asset.base64;await img.decode();return img;}
async function encode(c,meta){
 const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("LOCAL_ENCODE_FAILED")),"image/png"));
 if(blob.size>MAX_IMAGE)throw Error("LOCAL_OUTPUT_LIMIT");
 const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error("FILE_READ_FAILED"));r.readAsDataURL(blob);});
 return {kind:"image",mimeType:"image/png",base64:url.split(",")[1],width:c.width,height:c.height,...meta};
}
async function sourceSurface(asset){const img=await decoded(asset),w=img.naturalWidth,h=img.naturalHeight;validateDimensions(w,h);const {c,ctx}=surface(w,h);ctx.drawImage(img,0,0);return {c,ctx,w,h};}
export async function sharpenLocal(asset,values){
 const start=performance.now(),{c,ctx,w,h}=await sourceSurface(asset);
 const data=ctx.getImageData(0,0,w,h);data.data.set(sharpenPixels(data.data,w,h,values));ctx.putImageData(data,0,0);
 return encode(c,{model:"Local luminance enhancement",elapsedMs:Math.round(performance.now()-start),processing:"local"});
}
export async function prepareCutout(asset,points,useAlpha=false){
 if(!useAlpha&&!validPolygon(points))throw Error("MASK_INVALID");
 const {c,ctx,w,h}=await sourceSurface(asset),source=ctx.getImageData(0,0,w,h);
 let mask;
 if(useAlpha)mask=existingAlphaMask(source.data,w,h).mask;
 else{const m=surface(w,h);m.ctx.fillStyle="#fff";m.ctx.beginPath();points.forEach(([x,y],i)=>i?m.ctx.lineTo(x*w,y*h):m.ctx.moveTo(x*w,y*h));m.ctx.closePath();m.ctx.fill();mask=m.ctx.getImageData(0,0,w,h).data;m.c.width=m.c.height=1;}
 let protectedPixels=0,editablePixels=0;for(let i=3;i<mask.length;i+=4){if(mask[i]===255&&source.data[i]===255)protectedPixels++;if(mask[i]===0||source.data[i]===0)editablePixels++;}
 if(!protectedPixels||!editablePixels)throw Error("MASK_AREA_INVALID");
 return {c,ctx,w,h,source,mask};
}
export async function composeCutout(prepared,plan,generated=null){
 const start=performance.now(),{c,ctx,w,h,source,mask}=prepared;
 let final;
 if(plan.transparent)final=transparentPixels(source.data,mask,w,h);
 else{
   const b=surface(w,h);b.ctx.fillStyle=plan.color||"#ffffff";b.ctx.fillRect(0,0,w,h);
   if(!plan.color){
     if(!generated)throw Error("AI_OUTPUT_INVALID");
     const img=await decoded(generated);if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40e6)throw Error("IMAGE_DIMENSIONS_INVALID");
     const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
     b.ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
   }
   const background=b.ctx.getImageData(0,0,w,h);final=compositePixels(source.data,background.data,mask,w,h);b.c.width=b.c.height=1;
 }
 // Preserve original decoded pixels for an independent PNG round-trip check.
 const data=ctx.createImageData(w,h);data.data.set(final.pixels);ctx.putImageData(data,0,0);
 const result=await encode(c,{model:generated?.model||"Local background compositor",...(generated?{httpStatus:generated.httpStatus}:{}),elapsedMs:(generated?.elapsedMs||0)+Math.round(performance.now()-start),processing:"precision",protectedPixels:final.protectedPixels});
 const png=await decoded(result);
 if(png.naturalWidth!==w||png.naturalHeight!==h)throw Error("PIXEL_VERIFY_FAILED");
 ctx.clearRect(0,0,w,h);ctx.drawImage(png,0,0);
 const actual=ctx.getImageData(0,0,w,h).data;
 const verification=countPixelChanges(final.pixels,actual,source.data,mask,w,h);
 c.width=c.height=1;
 if(verification.changed||!verification.protectedPixels)throw Error("PIXEL_VERIFY_FAILED");
 return {...result,pixelVerified:true,protectedPixels:verification.protectedPixels,elapsedMs:(generated?.elapsedMs||0)+Math.round(performance.now()-start)};
}
