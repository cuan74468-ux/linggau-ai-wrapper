# Individual tool acceptance audit — 27 November 2026

Live Preview target 4265d8c; prior 4d9be8d retained for rollback. Source only UI changes, no provider/algorithm changes. CI 45919564630: 243 unit tests, mobile browser, real portrait, synthetic daily scope, 42 immutable CDN files PASS. Full complex-product gate FAIL 0/3 threshold. Live Gemini shared-frame runtime is not accessible to this connector. Owner screenshots on earlier version confirm mount, not all tool operations. Earlier isolated b81c28a screenshots confirm limited text and image generation, not acceptance of this revision. Do not mark tools ready based on form visibility or mocks. No paid provider, secret, license, production or pointer change in this audit commit.

## Priority findings
- P0: Real Gemini bridge capability reports method presence, not actual model/account availability or quota. 401/403/404/429/timeouts must be distinguished; no automatic retries or billing workarounds.
- P0: Complex product separation failed 0/3 threshold; default daily route deliberately refuses uncertain backgrounds. Test plain-background products first; do not claim perfect preservation. Local portrait has limited real benchmark evidence, not all photos.
- P1: Prompt-only identity protection (including hair, expression, try-on, angle) is not pixel enforcement. Review every real result. Do not market guarantees.
- P1: Text structure checks warn, not truth verification; no fabricated offers or search-volume claims.
- P1: Existing Chromium test opens all 41 forms but exercises only selected local/mock output paths. New all-tool direct-client contract audit tests routing, required fields, slot order, one request and 429 recovery. This is synthetic, not real provider or export acceptance.
- P1: Source shows potential competing prompt directives on authorized transformations; investigate with actual examples, not blanket changes.
- P1: Shared frame/keyboard, memory on low-end devices, two-photo upload, downloads, and guest-account restrictions require actual device tests.

## Per-tool manual acceptance
All rows NOT RUN for revision 4265d8c unless owner evidence is recorded. Use non-sensitive sample inputs; one request per chosen test, no bulk provider calls, stop on denied access/quota. Record tool ID, version, device, step (open/input/process/review/export), visible error, expected vs actual and optional screenshot. No secrets or personal source images in public repository. Reproduce and fix one root cause at a time. Do not require owner to test all in one sitting.

| # | Tool | Runtime | Acceptance check | Live result |
|---|---|---|---|---|
| 1 | product-photo — Foto Produk Profesional | Local preserve / AI optional | Foreground preserved; boundary/label check; complex object beta | NOT RUN |
| 2 | food-photo — Foto Makanan Profesional | Local preserve / AI optional | Foreground preserved; boundary/label check; complex object beta | NOT RUN |
| 3 | ai-model — Buat Model AI | text-to-image | Check requested subject, composition, ratio and export | NOT RUN |
| 4 | virtual-try-on — Virtual Try-On | image-to-image | Two ordered refs; identity and garment fidelity | NOT RUN |
| 5 | background — Ubah Background | Local preserve / AI optional | Foreground preserved; boundary/label check; complex object beta | NOT RUN |
| 6 | sharpen — Pertajam Foto | Local | Local clarity; compare crop, text, halos; no AI call | NOT RUN |
| 7 | poster — Generator Poster & Banner | AI background + local typography | Generate background + literal text overlay; exact heading and CTA | NOT RUN |
| 8 | seo-caption — Deskripsi Produk SEO & Caption | text-to-text | Five distinct keyword suggestions; no invented claims | NOT RUN |
| 9 | formal-photo — Foto Formal Profesional | Local preserve / AI optional | Foreground preserved; boundary/label check; complex object beta | NOT RUN |
| 10 | product-mockup — Studio Mockup Produk | Local preserve / AI optional | Foreground preserved; boundary/label check; complex object beta | NOT RUN |
| 11 | restore — Restorasi Foto | image-to-image | Compare reference and output; review and export | NOT RUN |
| 12 | logo — Generator Logo | text-to-image | Check requested subject, composition, ratio and export | NOT RUN |
| 13 | thumbnail — Thumbnail Pro | AI background + local typography | Generate background + literal text overlay; exact heading | NOT RUN |
| 14 | tiktok-ideas — Ide Konten TikTok | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 15 | ad-script — Script Story Iklan | text-to-text | Contiguous shot durations, exact selected total | NOT RUN |
| 16 | content-calendar — Kalender Konten | text-to-text | Exact day count; no false claims | NOT RUN |
| 17 | sketch-catalog — Sketsa ke Katalog | image-to-image | Compare reference and output; review and export | NOT RUN |
| 18 | studio-review — Studio Review Produk | image-to-image | Two ordered refs; exact product and model; no false testimonial | NOT RUN |
| 19 | photo-booth — Photo Booth | image-to-image | Compare reference and output; review and export | NOT RUN |
| 20 | portrait-aesthetic — Foto Profil & Estetik | image-to-image | Compare reference and output; review and export | NOT RUN |
| 21 | hair-style — Ganti Gaya Rambut | image-to-image | Only hair changes; face, accessories unchanged | NOT RUN |
| 22 | expression-edit — Ubah Ekspresi | image-to-image | Only expression changes; facial identity unchanged | NOT RUN |
| 23 | vehicle-custom — Modifikasi Kendaraan | image-to-image | Compare reference and output; review and export | NOT RUN |
| 24 | podcast-studio — Studio Podcast | image-to-image | Compare reference and output; review and export | NOT RUN |
| 25 | object-eraser — Hapus Objek | image-to-image | Compare reference and output; review and export | NOT RUN |
| 26 | outpaint — Perluas Foto | image-to-image | Compare reference and output; review and export | NOT RUN |
| 27 | id-photo-color — Pas Foto Warna | image-to-image | Correct uniform background, identity; not official-document guarantee | NOT RUN |
| 28 | angle-edit — Ganti Angle Foto | image-to-image | No hallucinated unseen surfaces | NOT RUN |
| 29 | style-match — Samakan Gaya | image-to-image | Two ordered refs; source identity, style only | NOT RUN |
| 30 | lesson-module — Modul Ajar & LKPD | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 31 | quiz-rubric — Soal Latihan & Rubrik | text-to-text | Exact count, keys, total weights 100 | NOT RUN |
| 32 | education-visual — Ilustrasi & Poster Edukasi | text-to-image | Check requested subject, composition, ratio and export | NOT RUN |
| 33 | learning-explainer — Peringkas & Penjelas Materi | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 34 | news-article — Artikel Berita & Feature SEO | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 35 | news-headline — Headline & Angle Berita | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 36 | editorial-image — Ilustrasi Editorial Berita | text-to-image | Check requested subject, composition, ratio and export | NOT RUN |
| 37 | avatar-style — Avatar 3D, Anime & Karikatur | image-to-image | Compare reference and output; review and export | NOT RUN |
| 38 | miniature-world — Foto Miniatur & Fantasi | image-to-image | Compare reference and output; review and export | NOT RUN |
| 39 | comic-strip — Komik Strip 4 Panel | text-to-image | Check requested subject, composition, ratio and export | NOT RUN |
| 40 | creative-writing — Lirik, Puisi, Pantun & Cerita | text-to-text | Complete output, factual accuracy and requested structure | NOT RUN |
| 41 | roi-calculator — Kalkulator ROI Iklan | Local | Known inputs and exact output; zero network AI calls | NOT RUN |
| 42 | Asisten AI (separate from catalog) | text-to-text | First send, follow-up, failure, new chat, scroll and copy | NOT RUN |

Status vocabulary: NOT RUN, PASS, FAIL, BLOCKED (permission/quota/network), PARTIAL (output requires correction). Live evidence may differ by account/device. CI does not replace real test.