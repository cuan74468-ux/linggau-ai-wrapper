import { FEATURES, CATEGORIES } from "../features/index.js";
export { CATEGORIES };
export function validateRegistry(features=FEATURES) {
  const ids=new Set();
  for(const f of features){
    if(!f.id || ids.has(f.id) || !CATEGORIES.includes(f.category)) throw new Error("FEATURE_INVALID");
    ids.add(f.id);
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
