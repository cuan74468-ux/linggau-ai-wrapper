export const RATIOS = Object.freeze(["auto","1:1","4:5","3:4","4:3","9:16","16:9"]);
export const OPTIONS = Object.freeze({
  background: ["Pertahankan asli","Studio beige","Putih bersih","Marmer","Kayu natural","Outdoor"],
  lighting: ["Pertahankan asli","Softbox natural","Cahaya jendela","Dramatis"],
  style: ["Pertahankan asli","Komersial natural","Editorial","Minimalis"],
  angle: ["Pertahankan asli","Eye level","45 derajat","Top view"]
});
export function normalize(feature, values = {}) {
  if(!values||typeof values!=="object"||Array.isArray(values))throw Error("INVALID_PARAMETER");
  const out = {};
  for (const field of feature.fields) {
    const v = (Object.hasOwn(values,field.id)?values[field.id]:undefined) ?? field.default ?? "";
    if (typeof v !== "string") throw new Error("INVALID_PARAMETER");
    const value = v.trim();
    if (field.required && !value) throw new Error("Lengkapi " + field.label);
    if (field.options && !field.options.includes(value)) throw new Error("INVALID_PARAMETER_" + field.id);
    if (value.length > (field.max || 1200)) throw new Error("PARAMETER_TOO_LONG_" + field.id);
    out[field.id] = value;
  }
  return out;
}
export const select = (id,label,options,initial=options[0]) => ({id,label,options,default:initial});
export const text = (id,label,required=false,max=1200) => ({id,label,required,max});
export const ratio = (initial="auto") => select("ratio","Rasio aspek",RATIOS,initial);
