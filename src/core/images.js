import { IMAGE_TYPES, MAX_IMAGE, imageBytes } from "./ai-client.js";
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
