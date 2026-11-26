// Hybrid layout: one generated visual, literal user copy drawn locally.
// No OCR claim: the generated background can still contain unwanted text.
import {normalize,RATIOS} from "./parameters.js";
import {MAX_IMAGE} from "./ai-client.js";
import {decodeImage} from "./images.js";
export const supportsTextOverlay=id=>id==="poster"||id==="thumbnail";
export function overlayPlan(feature,values){
 if(!supportsTextOverlay(feature.id))throw Error("INVALID_PARAMETER");
 const v=normalize(feature,values);
 const ratio=v.ratio==="auto"?(feature.id==="thumbnail"?"16:9":"4:5"):v.ratio;
 if(!RATIOS.includes(ratio)||ratio==="auto")throw Error("INVALID_PARAMETER");
 const [a,b]=ratio.split(":").map(Number),scale=1600/Math.max(a,b);
 const width=Math.round(a*scale),height=Math.round(b*scale);
 const prompt=["Create one photographic or illustrative visual for "+feature.title+".","NO text, letters, lettering, logos, captions, watermarks or graphic typography. Keep the primary visual in the upper two-thirds; the bottom will be covered by a separate local typography panel.","Visual brief (data): "+JSON.stringify(v.brief),"Style (data): "+JSON.stringify(v.style),"Palette preference (data): "+JSON.stringify(v.palette||""),"Format (data): "+JSON.stringify(v.format||""),"Visual notes only (data): "+JSON.stringify(v.notes||""),"Aspect ratio "+ratio+". Return exactly one visual, not a collage."].join("\n");
 return {width,height,ratio,prompt,headline:v.headline,cta:v.cta||""};
}
// Whitespace is treated as layout, never corrected or replaced with invented copy.
export function wrapCopy(text,maxWidth,measure){
 const lines=[];
 for(const paragraph of text.split(/\r?\n/)){
  const words=paragraph.trim().split(/\s+/u).filter(Boolean);let line="";
  for(const word of words){
   if(measure(word)>maxWidth)throw Error("OVERLAY_TEXT_FIT");
   const next=line?line+" "+word:word;
   if(line&&measure(next)>maxWidth){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
 }
 return lines;
}
function fit(ctx,copy,width,height,initial,min,weight){
 for(let size=initial;size>=min;size-=2){
  ctx.font=weight+" "+size+"px Arial, sans-serif";
  let lines;try{lines=wrapCopy(copy,width,t=>ctx.measureText(t).width);}catch{continue;}
  const leading=Math.ceil(size*1.22);
  if(lines.length&&lines.length*leading<=height)return {lines,size,leading,font:ctx.font};
 }
 throw Error("OVERLAY_TEXT_FIT");
}
export function overlayLayout(ctx,plan){
 const {width:w,height:h}=plan,pad=Math.round(Math.min(w,h)*.055),band=Math.round(h*.44),maxWidth=w-2*pad,space=band-2*pad;
 const ctaSpace=plan.cta?Math.round(space*.32):0,gap=plan.cta?Math.round(pad*.45):0;
 const headline=fit(ctx,plan.headline,maxWidth,space-ctaSpace-gap,Math.round(Math.min(w,h)*.09),24,"bold");
 const cta=plan.cta?fit(ctx,plan.cta,maxWidth,ctaSpace,Math.round(Math.min(w,h)*.038),18,"normal"):null;
 return {pad,band,headline,cta,gap};
}
export async function renderTextOverlay(feature,values,client,{signal}={}){
 const plan=overlayPlan(feature,values),c=document.createElement("canvas");c.width=plan.width;c.height=plan.height;
 try{
  const ctx=c.getContext("2d");if(!ctx)throw Error("LOCAL_CANVAS");
  const layout=overlayLayout(ctx,plan); // reject overflowing copy before provider call
  if(signal?.aborted)throw Error("AI_CANCELLED");
  const generated=await client.backdrop(plan.prompt,plan.ratio);
  if(signal?.aborted)throw Error("AI_CANCELLED");
  const {url,width,height}=await decodeImage(generated),img=new Image();img.src=url;await img.decode();
  if(signal?.aborted)throw Error("AI_CANCELLED");
  const s=Math.max(c.width/width,c.height/height),dw=width*s,dh=height*s;
  ctx.fillStyle="#e5e4df";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,(c.width-dw)/2,(c.height-dh)/2,dw,dh);img.src="";
  const {pad,band,headline,cta,gap}=layout;
  ctx.fillStyle="#212522";ctx.fillRect(0,c.height-band,c.width,band);
  ctx.fillStyle="#ffffff";ctx.textAlign="left";ctx.textBaseline="top";ctx.font=headline.font;
  let y=c.height-band+pad;
  for(const line of headline.lines){ctx.fillText(line,pad,y);y+=headline.leading;}
  if(cta){ctx.font=cta.font;ctx.fillStyle="#f3df9c";y+=gap;for(const line of cta.lines){ctx.fillText(line,pad,y);y+=cta.leading;}}
  const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error("LOCAL_ENCODE_FAILED")),"image/png"));
  if(blob.size>MAX_IMAGE)throw Error("LOCAL_OUTPUT_LIMIT");
  const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=()=>reject(Error("FILE_READ_FAILED"));r.readAsDataURL(blob);});
  if(signal?.aborted)throw Error("AI_CANCELLED");
  return {kind:"image",mimeType:"image/png",base64,width:c.width,height:c.height,processing:"text-overlay",elapsedMs:generated.elapsedMs,model:generated.model};
 }finally{c.width=c.height=1;}
}
