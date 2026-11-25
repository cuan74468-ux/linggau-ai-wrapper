// Optional lazy-loaded MediaPipe MagicTouch v1. No image upload. User must opt in.
import {confidenceAlpha} from "./vision-mask.js";
const BASE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21";
const MODEL="https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite";
let busy=false,initializing=false;
export async function segmentObject(canvas,point={x:.5,y:.5},load=()=>import(BASE+"/vision_bundle.mjs")){
 if(busy||initializing)throw Error("VISION_BUSY");
 if(!canvas||canvas.width<1||canvas.height<1||canvas.width*canvas.height>360000||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1||point.y<0||point.y>1)throw Error("MASK_INVALID");
 busy=true;let timer,segmenter,expired=false;
 try{
  initializing=true;const init=(async()=>{let lib;try{lib=await load();}catch{throw Error("VISION_LIBRARY_LOAD");}const {FilesetResolver,InteractiveSegmenter}=lib;let s;try{const files=await FilesetResolver.forVisionTasks(BASE+"/wasm");s=await InteractiveSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},outputCategoryMask:false,outputConfidenceMasks:true});}catch{throw Error("VISION_MODEL_LOAD");}if(expired){s.close();throw Error("VISION_TIMEOUT");}return s;})().finally(()=>{initializing=false;});
  segmenter=await Promise.race([init,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error("VISION_TIMEOUT"));},45000);})]);
  let result;
  // callback lifetime: copy data before returning to MediaPipe.
  segmenter.segment(canvas,{keypoint:{x:point.x,y:point.y}},r=>{
   const masks=r?.confidenceMasks,fg=masks?.[1];if(!fg)throw Error("VISION_MASK_UNAVAILABLE");
   result=confidenceAlpha(fg.getAsFloat32Array(),fg.width,fg.height);
  });
  if(!result)throw Error("VISION_MASK_UNAVAILABLE");return result;
 }finally{clearTimeout(timer);segmenter?.close();busy=false;}
}
