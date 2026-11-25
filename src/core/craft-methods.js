import {PROFESSION_METHODS} from "../features/professions.js";
// Explicit task workflow and parameter precedence. Prompt guidance, not independent model verification.
const METHODS=Object.freeze({
 ...PROFESSION_METHODS,
 "product-photo":"Identify the reference SKU, readable print, contour and visible materials first. Construct the set around the intact SKU; align camera perspective, surface contact and shadow. Use soft highlights on reflective materials, restrained negative space, and preserve small print before aesthetic polish.",
 "food-photo":"Identify the exact dish, serving vessel and visible ingredients. Style the surrounding table, not the food. Balance appetizing but accurate color, visible texture, highlight control and realistic scale. No invented steam, garnish, portion increase or food replacement.",
 "ai-model":"Design one fictional adult as a reusable fashion reference. Establish anatomical proportions and natural posture before choosing garment, camera crop and lighting. Avoid theatrical pose, dramatic lens distortion and distracting props unless explicitly selected and compatible.",
 "virtual-try-on":"Separate body evidence from garment evidence. Map visible garment boundaries to existing anatomy, then resolve seams, occlusion, folds, fabric tension and lighting. Preserve accessories and all visible non-target regions. A head-only input cannot support a full-body fitting.",
 "background":"Separate the protected foreground and background conceptually. Preserve face, glasses, headwear, hair edges and monochrome treatment. Integrate the environment using believable perspective and contact shadows without changing unrelated subject details.",
 "sharpen":"Inspect reliable visible detail first. Reduce artifacts conservatively before applying local edge clarity. Preserve natural texture, letters and skin; avoid halo, ringing and false reconstructed detail.",
 "formal-photo":"Treat this as professional presentation of the same portrait, not a new identity or outfit. Keep expression, eyewear, headwear, clothing and crop. Refine only the authorized light and background.",
 "product-mockup":"Establish product scale and support surface. Place the unchanged packaging in the selected environment. Use credible reflections, occlusion and cast shadows; never redesign the label or obscure the hero product.",
 "restore":"Separate recoverable surface damage from missing historical evidence. Repair the former conservatively, retain the original photographic medium and grain, and leave unsupported details uncertain.",
 "poster":"Build a single composition with a clear reading order: headline first, supplied CTA second if present, visual context third. Use adequate contrast, safe margins and uncluttered typography; check exact copy before returning.",
 "logo":"Create a standalone original raster mark and exact brand lettering. Prefer simple silhouette and negative space. Avoid photorealistic mockups, shadows, decorative filler, invented taglines or claims of vector output.",
 "thumbnail":"Use one dominant focal point, high contrast and the exact short headline. Keep all key content within safe margins for small screens. Avoid fake UI, misleading claims and arbitrary extra text.",
 "seo-caption":"Extract the factual product claims and audience from input. Separate suggested search terms from product facts. Write one final caption, with a useful CTA that does not assert an unknown contact channel, promotion or availability.",
 "tiktok-ideas":"Select one feasible creative angle suited to the supplied goal and audience. Give a specific first shot, opening line, sequential action and honest CTA; avoid trend or performance claims without evidence.",
 "ad-script":"Plan contiguous time intervals before writing dialogue. Align spoken words and on-screen copy to the corresponding visual action; keep speech feasible within the requested duration. Use only supplied offers and product facts.",
 "content-calendar":"Allocate exactly one entry per selected day. Vary topics and formats deliberately across the period without inventing market data, trends or offers; make each entry independently actionable."
});
export function craftMethod(id){const method=METHODS[id];if(!method)throw Error("METHOD_MISSING_"+id);return method;}
export function interactionRules(feature,v){
 const rules=[];
 if(feature.engine==="image-to-image"){
  if(v.background==="Pertahankan asli"&&!v.customBackground)rules.push("BACKGROUND LOCK: preserve the existing location, surfaces and backdrop. Scene, style and scene brief only refine presentation compatible with that original environment; never replace it.");
  if(v.lighting==="Pertahankan asli")rules.push("LIGHT LOCK: keep original subject illumination and tonal character; reconcile only environmental boundary/contact shadows.");
  if(v.angle&&v.angle!=="Pertahankan asli")rules.push("ANGLE CONDITION: change viewpoint only when supported by visible source geometry; otherwise retain it. Never invent unseen faces, labels or surfaces.");
  if(v.composition==="Pertahankan asli")rules.push("COMPOSITION LOCK: preserve subject scale and placement. Any angle request is subordinate when it would disrupt this composition.");
  if(v.ratio==="auto"||!v.ratio)rules.push("SOURCE FRAME: preserve original aspect ratio and visible crop as closely as possible.");
  if(v.ratio&&v.ratio!=="auto")rules.push("RATIO CONDITION: use surrounding space to reach the chosen ratio; no stretching, forced crop or invented hidden body.");
 }
 if(feature.id==="ai-model"){
  rules.push("FRAMING PRIORITY: "+v.framing+" controls the visible frame; pose wording never widens it.");
  if(v.framing==="Potret kepala dan bahu")rules.push("Do not show legs or full body, even if the pose option describes standing.");
  if(v.framing==="Seluruh badan")rules.push("Keep head and shoes fully within frame; avoid perspective exaggeration.");
 }
 if(feature.id==="virtual-try-on")rules.push("FIT CONDITION: garment construction controls fit; body shape and size remain unchanged. If the selected garment region is not visible, do not synthesize unseen anatomy. Garment reference never supplies identity, headwear or unrelated accessories.");
 if(feature.id==="food-photo")rules.push("FOOD LOCK: no scene or props choice authorizes new ingredients, garnish or larger serving.");
 if(["sharpen","restore"].includes(feature.id))rules.push("DETAIL PRIORITY: if noise reduction and clarity conflict, preserve reliable source detail and natural grain over aggressive smoothing or sharpening.");
 if(["poster","logo","thumbnail"].includes(feature.id))rules.push("COPY LOCK: supplied headline or brand name is literal. Blank optional CTA/palette is not printable copy. Brief and style never override exact spelling or readability.");
 if(feature.engine==="text-to-text")rules.push("FACT LOCK: keywords, tone, platform, notes and goal do not authorize unsupported factual claims. Treat invented contact details, discounts, endorsements or performance metrics as out of scope.");
 return rules;
}
