// Only the browser UI fixture uses this module. Actual runtime never imports it.
let attempts=0;
export async function segmentPortrait(c,{onStage=()=>{}}={}){
 onStage("Memisahkan orang dari latar…");onStage("Merapikan tepi rambut dan wajah…");
 if(++attempts>1)throw Error("VISION_MATTE_FAILED");
 return {width:5,height:5,alpha:new Uint8ClampedArray([0,0,0,0,0,0,255,255,255,0,0,255,255,255,0,0,255,255,255,0,0,0,0,0,0])};
}
