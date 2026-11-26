import {supportsPrecision,backdropPlan} from "./local-image.js";
import {supportsTextOverlay} from "./text-overlay.js";
export function processingRoute(feature,keepOriginal,values={}){
 if(supportsTextOverlay(feature.id))return {kind:"text-overlay",needsAI:true};
 if(feature.id==="sharpen")return {kind:"local-sharpen",needsAI:false};
 if(supportsPrecision(feature.id)&&keepOriginal){
  const plan=backdropPlan(values);
  return {kind:"preserve",needsAI:!plan.color&&!plan.transparent,plan};
 }
 return {kind:"generate",needsAI:true};
}
// Main controls remain concise; all other supported parameters remain editable.
export function primaryFieldIds(feature){
 const result=new Set(feature.fields.filter(p=>p.required).map(p=>p.id));
 if(feature.fields.some(p=>p.id==="ratio"))result.add("ratio");
 const main=feature.fields.find(p=>p.options&&p.id!=="ratio");
 if(main)result.add(main.id);
 return result;
}
