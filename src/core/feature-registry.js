import { FEATURES, CATEGORIES } from "../features/index.js";
import { getSkill } from "./skills.js";
import { RULES, TEXT_RULES } from "./parameter-rules.js";
export { CATEGORIES };
export function validateRegistry(features=FEATURES) {
  const ids=new Set();
  for(const f of features){
    if(!f.id || ids.has(f.id) || !CATEGORIES.includes(f.category)) throw new Error("FEATURE_INVALID");
    ids.add(f.id);getSkill(f.id);
    for(const p of f.fields){if(p.id==="ratio")continue;if(p.options){if(p.options.some(v=>!RULES[p.id]?.[v]))throw Error("PARAMETER_RULE_MISSING_"+f.id+"_"+p.id);}else if(!TEXT_RULES[p.id])throw Error("PARAMETER_RULE_MISSING_"+f.id+"_"+p.id);}
    if(!["image-to-image","text-to-image","text-to-text"].includes(f.engine)) throw new Error("ENGINE_INVALID");
    if(f.engine==="image-to-image" ? f.slots.length<1||f.slots.length>2 : f.slots.length!==0) throw new Error("SLOTS_INVALID");
    if(new Set(f.fields.map(x=>x.id)).size!==f.fields.length || !f.recipe) throw new Error("FIELDS_INVALID");
  }
  return features;
}
export function findFeatures(query="", category="all") {
  const q=query.trim().toLocaleLowerCase("id");
  return FEATURES.filter(f=>(category==="all"||f.category===category)&&[f.title,f.description,f.category].join(" ").toLocaleLowerCase("id").includes(q));
}
export function getFeature(id){return FEATURES.find(f=>f.id===id);}
validateRegistry();
