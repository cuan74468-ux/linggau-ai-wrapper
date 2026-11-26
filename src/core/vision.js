// Optional lazy-loaded MediaPipe MagicTouch v1. No image upload. User must opt in.
import {confidenceAlpha} from "./vision-mask.js";
const BASE="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21";
const MODEL="https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite";
const PERSON_MODEL="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
let busy=false,initializing=false;
// Emscripten routes this documented informational TFLite line through stderr.
// In embedded hosts that treat console.error as a fatal UI event, preserve the
// exact message at its correct level. Never suppress or reclassify other errors.
export function routeVisionInfo(logger=console){
 const prior=logger.error;
 const wrapped=function(...args){
  if(args.length===1&&typeof args[0]==="string"&&args[0].trim()==="INFO: Created TensorFlow Lite XNNPACK delegate for CPU."){
   return logger.info.apply(logger,args);
  }
  return prior.apply(logger,args);
 };
 try{logger.error=wrapped;}catch{return ()=>{};}
 return ()=>{try{if(logger.error===wrapped)logger.error=prior;}catch{}};
}
export async function segmentObject(canvas,point={x:.5,y:.5},load=()=>import(BASE+"/vision_bundle.mjs"),kind="object"){
 if(busy||initializing)throw Error("VISION_BUSY");
 if(!canvas||canvas.width<1||canvas.height<1||canvas.width*canvas.height>360000||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>1||point.y<0||point.y>1)throw Error("MASK_INVALID");
 busy=true;let timer,segmenter,expired=false;const restoreLog=routeVisionInfo();
 try{
  initializing=true;const init=(async()=>{let lib;try{lib=await load();}catch{throw Error("VISION_LIBRARY_LOAD");}const {FilesetResolver,InteractiveSegmenter,ImageSegmenter}=lib;let s;try{const files=await FilesetResolver.forVisionTasks(BASE+"/wasm");const opts={baseOptions:{modelAssetPath:kind==="person"?PERSON_MODEL:MODEL,delegate:"CPU"},outputCategoryMask:false,outputConfidenceMasks:true};s=kind==="person"?await ImageSegmenter.createFromOptions(files,{...opts,runningMode:"IMAGE"}):await InteractiveSegmenter.createFromOptions(files,opts);}catch{throw Error("VISION_MODEL_LOAD");}if(expired){s.close();throw Error("VISION_TIMEOUT");}return s;})().finally(()=>{initializing=false;});
  segmenter=await Promise.race([init,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error("VISION_TIMEOUT"));},45000);})]);
  let result,callbackError;
  // Copy confidence data inside its lifetime, but never throw across the WASM callback.
  const receive=r=>{
   try{
    const masks=r?.confidenceMasks,fg=masks?.[1];if(!fg)throw Error("VISION_MASK_UNAVAILABLE");
    result=confidenceAlpha(fg.getAsFloat32Array(),fg.width,fg.height);
   }catch(e){callbackError=e;}
  };
  try{if(kind==="person")segmenter.segment(canvas,receive);else segmenter.segment(canvas,{keypoint:{x:point.x,y:point.y}},receive);}
  catch(e){console.warn("LINGGAU_VISION_INFERENCE",e?.name||"Error");throw Error("VISION_INFERENCE_FAILED");}
  if(callbackError)throw callbackError;
  if(!result)throw Error("VISION_MASK_UNAVAILABLE");
  console.info("LINGGAU_VISION_MASK_OK",kind,result.width,result.height);
  return result;
 }finally{clearTimeout(timer);try{segmenter?.close();}finally{restoreLog();busy=false;}}
}

export function segmentPerson(canvas,load){return segmentObject(canvas,{x:.5,y:.5},load,"person");}
