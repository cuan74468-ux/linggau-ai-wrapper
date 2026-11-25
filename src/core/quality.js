import {getSkill} from "./skills.js";
// Local checks only. No extra inference, network, or aesthetic score.
export function assessOutput(feature,values,result){
 const skill=getSkill(feature.id),checks=[];
 if(result.kind==="image"){
   const w=result.width,h=result.height;
   checks.push({label:"Dimensi gambar valid",state:Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0?"pass":"warn"});
   const ratio=values.ratio;
   if(ratio&&ratio!=="auto"){
     const [a,b]=ratio.split(":").map(Number);
     const actual=w/h,expected=a/b;
     const ok=Number.isFinite(actual)&&Math.abs(actual/expected-1)<=0.03;
     checks.push({label:"Rasio "+ratio+(ok?" sesuai toleransi 3%":" tidak sesuai; hasil tidak dipotong otomatis"),state:ok?"pass":"warn"});
   }
 }else{
   const normalized=String(result.text||"").toLocaleUpperCase("id");
   for(const heading of skill.headings)checks.push({label:"Bagian "+heading,state:normalized.includes(heading)?"pass":"warn"});
 }
 return Object.freeze({checks:Object.freeze(checks.map(Object.freeze)),review:skill.review});
}
