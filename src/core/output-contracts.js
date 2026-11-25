import {PROFESSION_CONTRACTS} from "../features/professions.js";
// Strict, human-readable text output contract. No extra AI call or automatic repair.
export const TEXT_CONTRACTS=Object.freeze({
 ...PROFESSION_CONTRACTS,
 "seo-caption":{headings:["JUDUL PRODUK","DESKRIPSI SEO","5 KATA KUNCI SUGESTI","CAPTION","CTA"],instruction:"Use exactly these standalone headings in order: JUDUL PRODUK, DESKRIPSI SEO, 5 KATA KUNCI SUGESTI, CAPTION, CTA. Each section has nonempty content. In the keyword section write exactly five distinct entries, numbered 1. through 5., one per line. Produce one final caption only, not alternatives. CTA must not invent an ordering channel, address or availability."},
 "tiktok-ideas":{headings:["HOOK","VISUAL","ALUR","CTA"],instruction:"Deliver one production-ready TikTok concept, not five alternatives. Use exactly these standalone headings in order: HOOK, VISUAL, ALUR, CTA. Write a specific opening, feasible shot direction, sequential action and one honest CTA."},
 "ad-script":{headings:["KONSEP","ADEGAN & WAKTU","NARASI","TEKS LAYAR","CTA"],instruction:"Use exactly these standalone headings in order: KONSEP, ADEGAN & WAKTU, NARASI, TEKS LAYAR, CTA. In ADEGAN & WAKTU use one line per shot in format 0-5s | action (integer seconds, contiguous intervals starting at zero and ending exactly at selected duration). Use corresponding shot numbers in narration and screen text. One final script, not alternatives."},
 "content-calendar":{headings:["HARI","FORMAT","TOPIK","HOOK","CTA"],instruction:"Write exactly one calendar. Repeat the five standalone field headings HARI, FORMAT, TOPIK, HOOK, CTA in this exact order per day. Put day number alone on the next line after HARI, beginning at 1 and ending at the selected period. Fill each of the other four fields. Do not output alternative calendars."}
});
const cleanHeading=line=>line.trim().replace(/^#{1,6}\s+/,"").replace(/^\*\*(.*?)\*\*\s*:?$/,"$1").replace(/:$/,"").trim().toLocaleUpperCase("id");
export function parseSections(text,headings){
 const parts=[];let current=null,preamble=false;
 for(const line of String(text||"").split(/\r?\n/)){
   const h=cleanHeading(line);
   if(headings.includes(h)){current={heading:h,lines:[]};parts.push(current);}
   else if(current)current.lines.push(line);
   else if(line.trim())preamble=true;
 }
 return {preamble,parts:parts.map(p=>({heading:p.heading,body:p.lines.join("\n").trim()}))};
}
export function checkText(featureId,values,text){
 const contract=TEXT_CONTRACTS[featureId];if(!contract)return [];
 const {parts,preamble}=parseSections(text,contract.headings);
 const expected=featureId==="content-calendar"?Number.parseInt(values.period,10):1;
 const rows=Number.isInteger(expected)&&expected>0?expected:1;
 const check=(label,ok)=>({label,state:ok?"pass":"warn"});
 const checks=contract.headings.map(h=>check("Bagian "+h,parts.filter(p=>p.heading===h&&p.body).length===rows));
 checks.push(check("Urutan bagian lengkap tanpa duplikasi",!preamble&&parts.length===rows*contract.headings.length&&parts.every((p,i)=>p.heading===contract.headings[i%contract.headings.length]&&p.body)));
 if(featureId==="seo-caption"){
   const body=parts.find(p=>p.heading==="5 KATA KUNCI SUGESTI")?.body||"";
   const lines=body.split("\n").filter(l=>l.trim());const entries=lines.map(l=>l.match(/^\s*(\d+)[.)]\s+(.+?)\s*$/));
   checks.push(check("Lima kata kunci berbeda",lines.length===5&&entries.every((m,i)=>m&&Number(m[1])===i+1)&&new Set(entries.filter(Boolean).map(m=>m[2].toLowerCase())).size===5));
 }
 if(featureId==="ad-script"){
   const body=parts.find(p=>p.heading==="ADEGAN & WAKTU")?.body||"";
   const entries=body.split("\n").filter(l=>l.trim()).map(l=>l.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*s\s*\|\s*(\S.*)$/i));
   let last=0;const valid=entries.length>0&&entries.every(m=>{if(!m||+m[1]!==last||+m[2]<=last)return false;last=+m[2];return true;});
   checks.push(check("Durasi berurutan sesuai target",valid&&last===Number.parseInt(values.duration,10)));
 }
 if(featureId==="content-calendar"){
   const days=parts.filter(p=>p.heading==="HARI");
   checks.push(check("Hari berurutan sesuai periode",days.length===rows&&days.every((p,i)=>p.body===String(i+1))));
 }
 if(featureId==="quiz-rubric"){
   const n=Number.parseInt(values.questionCount,10),get=h=>parts.find(p=>p.heading===h)?.body||"";
   const numbered=s=>s.split(/\r?\n/).filter(x=>x.trim()).map(l=>l.match(/^\s*(\d+)[.)]\s+(.+)$/));
   const q=numbered(get("SOAL")),a=numbered(get("KUNCI & PEMBAHASAN"));
   const ordered=arr=>Number.isInteger(n)&&arr.length===n&&arr.every((m,i)=>m&&+m[1]===i+1);
   checks.push(check("Jumlah dan urutan soal/kunci",ordered(q)&&ordered(a)));
   const weights=a.map(m=>m?.[2].match(/\|\s*Pembahasan:\s*(\S.*?)\s*\|\s*Bobot:\s*(\d+)\s*$/i));
   checks.push(check("Pembahasan dan bobot total 100",ordered(a)&&weights.every(m=>m&&+m[2]>0)&&weights.reduce((sum,m)=>sum+(m?+m[2]:0),0)===100));
   if(values.questionKind==="Pilihan ganda")checks.push(check("Pilihan A–D dan kunci",ordered(q)&&ordered(a)&&q.every(m=>["A.","B.","C.","D."].every(x=>m[2].includes(x)))&&a.every(m=>/^[A-D](?:[.)\s|])/.test(m[2]))));
 }
 return checks;
}
