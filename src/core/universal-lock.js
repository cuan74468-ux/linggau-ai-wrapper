export const UNIVERSAL_LOCK = [
  "Treat provided images as the primary visual ground truth.",
  "Preserve protected subject identity, facial structure, geometry, proportions, intrinsic colors, material, patterns, textures, original logos, exact labels, spelling and numbers.",
  "Do not replace subjects, fabricate concealed details or redesign protected branding.",
  "Only change the attributes explicitly authorized by the selected feature and parameters.",
  "If an aesthetic instruction conflicts with subject fidelity, prioritize fidelity; do not invent a new identity.",
  "Preserve original perspective unless a permitted pose or angle change is explicitly selected.",
  "Maintain coherent shadows and natural composition. Pixel-identical preservation is not guaranteed."
].join("\n");
export function buildPrompt(feature, values) {
  const allowed = feature.fields.filter(f=>f.id!=="ratio" && f.id!=="notes").map(f=>f.label+": "+(values[f.id]||"(tidak ditentukan)")).join("\n");
  return [
    feature.recipe,
    feature.engine==="image-to-image" ? UNIVERSAL_LOCK : "",
    "Reference order: "+(feature.slots.join("; ") || "none"),
    "Requested parameters:\n"+allowed,
    values.ratio && values.ratio!=="auto" ? "Requested aspect ratio: "+values.ratio : "",
    values.notes ? "Additional user preferences (within allowed feature scope): "+values.notes : "",
    feature.engine==="text-to-text" ? "Write in Indonesian. Do not invent facts, specifications, testimonials, search data or SEO metrics. Mark unknown facts. Use the requested headings." : "Return one image. Do not add unsolicited text, watermarks or logos."
  ].filter(Boolean).join("\n\n");
}
