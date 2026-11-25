// Browser UI fixture only: no network or actual segmentation inference.
let attempts=0;
export async function segmentObject(){if(++attempts>1)throw Error("VISION_MODEL_LOAD");return {width:5,height:5,alpha:new Uint8ClampedArray([0,0,0,0,0,0,255,255,255,0,0,255,255,255,0,0,255,255,255,0,0,0,0,0,0])};}

export async function segmentPerson(){return segmentObject();}
