// Presets set existing enumerated controls only. No hidden changes to user text or reference images.
const p=(label,values)=>Object.freeze({label,values:Object.freeze(values)});
export const PRESETS=Object.freeze({
 "product-photo":[p("Katalog bersih",{background:"Putih bersih",lighting:"Softbox natural",style:"Minimalis",angle:"Pertahankan asli",composition:"Produk di tengah",props:"Tanpa tambahan",ratio:"1:1"}),p("Editorial promosi",{background:"Marmer",lighting:"Cahaya jendela",style:"Editorial",angle:"Pertahankan asli",composition:"Ruang kosong untuk teks",props:"Properti sederhana yang relevan",ratio:"4:5"})],
 "food-photo":[p("Menu restoran",{background:"Kayu natural",lighting:"Cahaya jendela",style:"Komersial natural",angle:"Pertahankan asli",scene:"Meja makan natural",props:"Minimal, tanpa menambah bahan makanan",ratio:"4:5"}),p("Katalog makanan",{background:"Putih bersih",lighting:"Softbox natural",style:"Minimalis",angle:"Pertahankan asli",scene:"Katalog menu bersih",props:"Pertahankan asli",ratio:"1:1"})],
 "ai-model":[p("Model dasar katalog",{outfit:"Kaus polos dan celana panjang",framing:"Seluruh badan",pose:"Berdiri depan, tangan rileks",background:"Studio beige",lighting:"Softbox natural",ratio:"4:5"}),p("Potret fashion",{outfit:"Busana kasual sopan",framing:"Setengah badan",pose:"Tampak tiga perempat",background:"Putih bersih",lighting:"Cahaya jendela",ratio:"3:4"})],
 "virtual-try-on":[p("Fitting natural",{garment:"Otomatis dari foto",fit:"Natural sesuai referensi",background:"Pertahankan asli",lighting:"Pertahankan asli",ratio:"auto"}),p("Katalog fashion",{garment:"Otomatis dari foto",fit:"Natural sesuai referensi",background:"Studio beige",lighting:"Softbox natural",ratio:"4:5"})],
 "background":[p("Studio netral",{background:"Studio beige",lighting:"Pertahankan asli",ratio:"auto"}),p("Katalog putih",{background:"Putih bersih",lighting:"Pertahankan asli",ratio:"auto"})],
 "sharpen":[p("Detail natural",{strength:"Ringan",noise:"Minimal",detail:"Seimbang"}),p("Produk & tulisan",{strength:"Sedang",noise:"Minimal",detail:"Tulisan dan tepi"})],
 "formal-photo":[p("Profil profesional",{background:"Studio beige",lighting:"Softbox natural",ratio:"4:5"}),p("Potret netral",{background:"Putih bersih",lighting:"Pertahankan asli",ratio:"auto"})],
 "product-mockup":[p("Katalog mockup",{background:"Putih bersih",lighting:"Softbox natural",composition:"Produk di tengah",ratio:"1:1"}),p("Kampanye editorial",{background:"Kayu natural",lighting:"Cahaya jendela",composition:"Ruang kosong untuk teks",ratio:"4:5"})],
 "restore":[p("Restorasi konservatif",{strength:"Ringan",noise:"Minimal",detail:"Seimbang"}),p("Kerusakan terlihat",{strength:"Sedang",noise:"Sedang",detail:"Tekstur objek"})],
 "poster":[p("Promosi feed",{format:"Poster promosi",style:"Minimalis",ratio:"4:5"}),p("Banner landscape",{format:"Banner digital",style:"Editorial",ratio:"16:9"})],
 "logo":[p("Identitas minimalis",{style:"Minimalis",ratio:"1:1"}),p("Konsep editorial",{style:"Editorial",ratio:"1:1"})],
 "thumbnail":[p("Thumbnail YouTube",{style:"Komersial natural",ratio:"16:9"}),p("Sampul vertikal",{style:"Minimalis",ratio:"9:16"})],
 "seo-caption":[p("Listing marketplace",{tone:"Profesional",platform:"Marketplace",goal:"Informasi produk"}),p("Promosi Instagram",{tone:"Persuasif ringan",platform:"Instagram",goal:"Penjualan"})],
 "tiktok-ideas":[p("Edukasi singkat",{tone:"Natural",goal:"Edukasi"}),p("Promosi natural",{tone:"Persuasif ringan",goal:"Penjualan"})],
 "ad-script":[p("Iklan TikTok 15 detik",{tone:"Natural",platform:"TikTok",goal:"Penjualan",duration:"15 detik"}),p("Video Instagram 30 detik",{tone:"Profesional",platform:"Instagram",goal:"Informasi produk",duration:"30 detik"})],
 "content-calendar":[p("Instagram mingguan",{platform:"Instagram",goal:"Edukasi",period:"7 hari"}),p("TikTok dua minggu",{platform:"TikTok",goal:"Penjualan",period:"14 hari"})]
});
export function validatePresets(feature){
 const presets=PRESETS[feature.id];if(!presets?.length)throw Error("PRESET_MISSING_"+feature.id);
 for(const preset of presets)for(const [id,v] of Object.entries(preset.values)){
  const field=feature.fields.find(f=>f.id===id);
  if(!field?.options?.includes(v))throw Error("PRESET_INVALID_"+feature.id+"_"+id);
 }
 return presets;
}
export function applyPreset(feature,values,index){
 const selected=validatePresets(feature)[index];if(!selected)throw Error("PRESET_INVALID");
 return {...values,...selected.values};
}
