import { IMAGE_TYPES, MAX_IMAGE, imageBytes } from "./ai-client.js";
import {LOCAL_MAX_PIXELS,validateDimensions} from "./pixels.js";
export async function decodeImage(image){
  imageBytes(image);
  const url="data:"+image.mimeType+";base64,"+image.base64;
  const element=new Image();
  element.src=url;
  await element.decode();
  if(!element.naturalWidth||!element.naturalHeight||element.naturalWidth*element.naturalHeight>40e6) throw new Error("IMAGE_DIMENSIONS_INVALID");
  return {url,width:element.naturalWidth,height:element.naturalHeight};
}
export async function readImage(file){
  if(!file||!IMAGE_TYPES.includes(file.type)||!file.size||file.size>MAX_IMAGE) throw new Error("IMAGE_LIMIT_OR_FORMAT");
  const data=await new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("FILE_READ_FAILED"));r.readAsDataURL(file);
  });
  const image={mimeType:file.type,base64:data.split(",")[1]};
  const dimensions=await decodeImage(image);
  return {...image,width:dimensions.width,height:dimensions.height};
}

// Work at a bounded resolution while retaining the source framing and aspect.
// Never write back to the device file. Small accepted photos are unchanged.
export function workingDimensions(w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>40e6)throw Error("IMAGE_DIMENSIONS_INVALID");
 const scale=Math.min(1,Math.sqrt(LOCAL_MAX_PIXELS/(w*h)),4096/w,4096/h);
 const width=Math.max(1,Math.floor(w*scale)),height=Math.max(1,Math.floor(h*scale));
 validateDimensions(width,height);return {width,height};
}
function blobData(blob){
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=()=>reject(Error("FILE_READ_FAILED"));reader.readAsDataURL(blob);});
}
export async function prepareWorkingPhoto(asset){
 if(imageBytes(asset)>MAX_IMAGE)throw Error("IMAGE_LIMIT");
 const {width:w,height:h,url}=await decodeImage(asset);
 let {width,height}=workingDimensions(w,h);
 if(w===width&&h===height)return {...asset,width:w,height:h};
 const source=new Image();source.src=url;await source.decode();
 const canvas=document.createElement("canvas");
 try{
  // JPEG stays JPEG. PNG/WebP use PNG to preserve transparency.
  const mimeType=asset.mimeType==="image/jpeg"?"image/jpeg":"image/png";
  for(let attempt=0;attempt<4;attempt++){
   canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("LOCAL_CANVAS_UNAVAILABLE");
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
   ctx.drawImage(source,0,0,width,height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("LOCAL_ENCODE_FAILED")),mimeType,.95));
   if(blob.type!==mimeType)throw Error("LOCAL_ENCODE_FAILED");
   if(blob.size<=MAX_IMAGE){
    const base64=await blobData(blob);
    return {...asset,mimeType,base64,width,height,resized:true,originalWidth:asset.originalWidth||w,originalHeight:asset.originalHeight||h};
   }
   width=Math.max(1,Math.floor(width*.8));height=Math.max(1,Math.floor(height*.8));
  }
  throw Error("LOCAL_OUTPUT_LIMIT");
 }finally{canvas.width=canvas.height=1;source.src="";}
}
