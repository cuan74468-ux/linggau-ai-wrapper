// Clean-room parameter semantics: every enumerated value has an explicit directive.
export const RULES = Object.freeze({
 duration:{"15 detik":"Target a total of 15 seconds.","30 detik":"Target a total of 30 seconds.","60 detik":"Target a total of 60 seconds."},
 period:{"7 hari":"Provide exactly 7 daily entries.","14 hari":"Provide exactly 14 daily entries.","30 hari":"Provide exactly 30 daily entries."},
 background:{
 "Pertahankan asli":"Preserve the existing background, location, surfaces and backdrop; do not replace them.",
 "Studio beige":"Use a seamless light warm beige studio backdrop, clean and uncluttered; no outdoor scene.",
 "Putih bersih":"Use a clean neutral white seamless background; retain visible subject edges.",
 "Marmer":"Use a restrained neutral marble setting; never apply marble texture to the subject.",
 "Kayu natural":"Use natural wood as the environmental surface only; retain subject materials.",
 "Outdoor":"Use a natural outdoor setting without adding objects that obscure the subject."
 },
 lighting:{
 "Pertahankan asli":"Preserve the original subject lighting, tonal range and color balance; only reconcile boundary shadows if essential.",
 "Softbox natural":"Use broad soft diffused studio light, gentle shadows and neutral white balance; retain intrinsic subject colors.",
 "Cahaya jendela":"Use soft directional window light with believable shadow direction; do not recolor the subject.",
 "Dramatis":"Use controlled directional contrast without crushing protected details or changing intrinsic colors."
 },
 style:{
 "Pertahankan asli":"Maintain the original visual medium, texture and color treatment.",
 "Komersial natural":"Use realistic commercial photography, not illustration or a product redesign.",
 "Editorial":"Use refined editorial composition while retaining source identity and details.",
 "Minimalis":"Simplify surrounding elements; do not simplify or remove protected subject details."
 },
 angle:{
 "Pertahankan asli":"Keep exact source viewpoint and perspective.",
 "Eye level":"Use eye-level perspective only if supported by visible reference geometry; otherwise keep original angle.",
 "45 derajat":"Use a three-quarter viewpoint only if visible reference geometry supports it; never invent hidden surfaces.",
 "Top view":"Use top-down view only where source geometry is sufficient; otherwise retain source angle."
 },
 composition:{
 "Pertahankan asli":"Keep original crop, subject scale, relative positions and orientation.",
 "Produk di tengah":"Center the complete product using surrounding canvas; do not stretch or crop its label.",
 "Ruang kosong untuk teks":"Leave negative space around the intact product without inventing any text."
 },
 props:{
 "Tanpa tambahan":"Add no props; retain existing protected objects.",
 "Properti sederhana yang relevan":"Add only restrained contextual props behind or beside the product, without occluding it.",
 "Pertahankan asli":"Keep existing props and their relationship to the subject.",
 "Minimal, tanpa menambah bahan makanan":"Use minimal non-food contextual props only; do not add ingredients or modify the dish."
 },
 scene:{
 "Meja makan natural":"Use natural dining atmosphere consistent with selected background.",
 "Editorial restoran":"Use refined restaurant editorial styling within selected background and lighting.",
 "Katalog menu bersih":"Use uncluttered menu presentation within the selected background."
 },
 age:{
 "18–25 tahun":"Depict a fictional adult aged 18 to 25.",
 "26–35 tahun":"Depict a fictional adult aged 26 to 35.",
 "36–50 tahun":"Depict a fictional adult aged 36 to 50.",
 "51 tahun ke atas":"Depict a fictional adult aged at least 51."
 },
 outfit:{
 "Kaus polos dan celana panjang":"Plain T-shirt and long trousers, no branding.",
 "Kemeja polos dan celana panjang":"Plain collared shirt and long trousers, no branding.",
 "Busana kasual sopan":"Simple modest casual clothing, no branding."
 },
 framing:{
 "Seluruh badan":"Show entire figure including head, hands and shoes; keep natural proportions and breathing room.",
 "Setengah badan":"Frame head to waist; do not fabricate unseen limbs in frame.",
 "Potret kepala dan bahu":"Frame head and shoulders; do not invent a full body."
 },
 pose:{
 "Berdiri depan, tangan rileks":"Front-facing neutral standing pose, relaxed hands, realistic joints; honor selected crop.",
 "Tampak tiga perempat":"Natural three-quarter standing orientation, anatomically consistent; honor selected crop.",
 "Berdiri seluruh badan":"Neutral standing pose; the framing selection controls actual crop."
 },
 garment:{
 "Otomatis dari foto":"Identify the visible garment type from reference 2; apply only supported visible garment regions.",
 "Atasan":"Transfer only the upper garment; preserve other clothing.",
 "Bawahan":"Transfer only the lower garment; preserve other clothing.",
 "Setelan":"Transfer the visible matching outfit; do not add unrelated accessories.",
 "Gaun":"Transfer only the visible dress while maintaining modest coverage."
 },
 fit:{
 "Natural sesuai referensi":"Fit the garment to existing anatomy with natural drape and folds.",
 "Longgar sesuai desain":"Use a looser drape only where consistent with garment construction; do not enlarge the body.",
 "Pas sesuai desain":"Fit according to garment construction; never reshape or slim the model."
 },
 strength:{
 "Ringan":"Apply subtle edge clarity without visible reconstruction.",
 "Sedang":"Apply moderate conservative sharpening without changing details.",
 "Kuat":"Apply stronger clarity only to reliable visible information; avoid halos and invented texture."
 },
 noise:{
 "Minimal":"Retain natural grain; reduce only obvious compression artifacts.",
 "Sedang":"Reduce distracting noise while retaining fine texture and grain.",
 "Kuat":"Reduce noise conservatively in smooth areas; never erase protected fine detail."
 },
 detail:{
 "Seimbang":"Balance clarity across existing visible features.",
 "Tekstur objek":"Prioritize authentic visible surface texture; no synthetic replacement.",
 "Tulisan dan tepi":"Prioritize existing readable characters and edges; never guess illegible text."
 },
 format:{
 "Poster promosi":"Compose a standalone promotional poster with clear hierarchy.",
 "Banner digital":"Compose a digital banner with readable headline and safe margins.",
 "Pengumuman":"Compose an announcement with prominent headline and uncluttered hierarchy."
 },
 tone:{
 "Natural":"Use conversational Indonesian without exaggerated claims.",
 "Profesional":"Use clear professional Indonesian with factual wording.",
 "Persuasif ringan":"Use gentle persuasive wording without pressure or unsupported promises."
 },
 platform:{
 "Marketplace":"Optimize for listing readability, factual benefits and concise scannable text.",
 "Instagram":"Use an engaging caption with readable short paragraphs.",
 "TikTok":"Use a short hook and conversational caption suitable for short-form video.",
 "WhatsApp":"Use concise friendly message copy that is easy to forward.",
 "Website":"Use clear descriptive headings and natural search-friendly language."
 },
 goal:{
 "Informasi produk":"Prioritize factual product information.",
 "Penjualan":"Prioritize verified benefits and a clear honest call to action.",
 "Edukasi":"Prioritize useful explanations based on the supplied facts."
 }
});
export const TEXT_RULES=Object.freeze({
 sceneBrief:"Use this description only for external mockup context; never alter protected product design or branding.",
 subject:"Use this description for visual characteristics only where it does not conflict with structured age, outfit, framing, pose, background or lighting choices.",
 customBackground:"A nonempty custom description overrides the background preset only; it never authorizes subject changes.",
 brief:"Use the brief for visual direction; explicit headline, CTA, format and palette control their respective attributes.",
 headline:"Render this headline exactly, without translation, paraphrase or extra text.",
 cta:"Render the supplied CTA exactly; if empty, omit CTA.",
 palette:"Use supplied colors for design elements; maintain legibility.",
 product:"Treat supplied facts as the sole factual source; mark unknowns instead of inventing.",
 audience:"Adapt language and benefits to the specified audience without stereotypes.",
 keywords:"Use supplied keywords naturally; do not claim verified search volume.",
 notes:"Apply only compatible refinements; never override protected regions, feature scope or explicit controls."
});
