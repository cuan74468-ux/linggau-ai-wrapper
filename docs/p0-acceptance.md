# P0 acceptance ledger — 25 November 2026
Baseline: 5d9ca03. This is a test plan, not fabricated evidence. Repeat affected workflows against the promoted candidate. Record revision, account/device (not email), input type, selected parameters, actual result and PASS/WARN/FAIL. Avoid sensitive images.

| Tool | Real acceptance case | Status before current promotion |
|---|---|---|
| Product photo | Labeled package, intact text and geometry, beige background | OPEN |
| Food photo | Bakso, identical bowl, portion, ingredients, natural light | OPEN |
| AI model | Single adult, full-body natural hands, shoes, margins | Historical engine PASS; quality retest |
| Virtual try-on | Reuse model; garment-only reference, no pasted head, natural seams | Historical HTTP PASS / visual FAIL; retest |
| Background | Monochrome portrait, new background, foreground remains monochrome | Historical engine PASS; retest |
| Sharpen | Low-detail original; no invented text or face | OPEN |
| Poster | Exact headline, CTA, aspect, legibility | OPEN |
| SEO caption | Supplied product facts only, one caption, five keywords | Historical engine & clipboard PASS; retest new contract |
| Formal photo | Preserve clothing, facial details, original crop | OPEN |
| Product mockup | Label and shape unchanged, realistic contact shadow | OPEN |
| Restore | Old monochrome image, no fabricated detail | OPEN |
| Logo | Exact spelling, simple readable raster concept | OPEN |
| Thumbnail | Exact headline, 16:9, legible on phone | OPEN |
| TikTok ideas | One actionable concept, four nonempty sections | OPEN |
| Ad script | One 15-second script, contiguous timing | OPEN |
| Calendar | Seven sequential days with complete fields | OPEN |

Cross-cutting gates: same Canvas link shows promoted SHA without shell edits; mobile 360px no horizontal overflow, nav and form usable; image download and text copy; asset reuse model -> try-on without reupload; cross-account actual candidate; 401/403/429 fail closed with no automatic retry; user consent/privacy and applicable provider terms/quota confirmed before commercial release.

One generate = one result object, not alternative drafts; a calendar or keyword list is one deliverable with multiple components. Local structure checks warn on empty/missing/repeated/out-of-order sections, keyword count, ad timing and calendar day count. They do not verify factual truth, identity or design quality. Warn results remain accessible for review, never labelled fully validated. No automatic re-generation. CI mocks are not runtime evidence.

## Additional checkpoint
Owner confirmed latest redesigned workspace loaded after GitHub Raw correction and reported mobile layout feedback. Automated update and layout behavior must still be recorded with actual revision/device evidence; no new visual quality passes inferred. Presets need live UI check: selecting one updates only enumerated controls, manual override remains possible, no AI call until Process. Auto-ratio warning compares decoded source dimensions when available. No quality score or semantic verification.

## P0 identity incident — owner report
Owner reports uploaded person rendered with a substantially different face. Treat as FAIL, exact tool/input/settings not yet supplied. Code audit confirms current repository forwards original reference bytes in order to editImage; actual failing runtime request not captured. Prompt-only lock is not pixel/identity verification. All reference edits now require a side-by-side user decision before adding to session assets, reuse or download. Rejection does not auto-retry. This does not repair a changed face. Next live test: same portrait with original lighting and ratio, background change only; compare face, expression, eyewear, hair/headwear, crop. Record failure even if HTTP 200. For truly hard preservation, evaluate non-generative operations and user-guided mask/compositing as a separate candidate; no biometric service or paid provider assumed. P0 remains open.

## Hybrid preservation pilot
Sharpen uses bounded non-generative luminance processing; no AI request. Background and formal photo default to a user-traced polygon precision mode, preserve original dimensions and opaque protected decoded RGBA, and export PNG. Solid white/beige background uses zero model calls; other/custom backgrounds use one text-to-image call with no source photo transmitted. Manual polygon is not automatic segmentation; soft/transparent edges are blended, hair and contact shadows require review. Precision mode does not apply generative lighting, crop or notes; those controls are hidden. Original generative mode is explicitly selectable and still requires user acceptance. Local limit 4MP/4096px and output 8MB; fail closed rather than silently resize. Tests prove pure pixel math and mock routing, not browser integration, identity similarity or actual Canvas runtime. Test same portrait with white background and a careful mask, then product and outdoor background; confirm no face drift and evaluate edges. No commercial approval or P0 closure.

## Expanded precision pilot
Product, food, and product mockup join background/formal precision mode. Output retains source framing; unsupported styling controls and presets are hidden. Product mockup scene brief is used for background only, unless transparent export is selected. Transparent PNG export and automatic reuse of existing alpha are local; ordinary opaque photos still need a manual contour. Freehand/polygon controls are optional methods to draw that contour, not ML segmentation. PNG is decoded and protected opaque pixels compared to the source; a changed protected pixel rejects output. Edges, photorealism, masks, phone memory use and actual Canvas rendering still require live QA. Existing 4 MP / 8 MB limits retained. No new catalog tool or external dependency.

## Batch 1A — local vision pilot
MediaPipe Tasks Vision pinned 0.10.21 and MagicTouch v1 float32 model (Apache 2.0 model card). Lazy load only after user consent; local inference, external asset downloads and possible provider metrics. No Gemini request for detection. Center seed is a suggestion, not guaranteed foreground; tap to reselect after successful detection, brush +/- or manual contour. Confidence remap and bilinear alpha are edge smoothing, not true hair matting or color decontamination. Optional synthetic contact shadow only on background; not relighting. Existing PNG round-trip check protects opaque selected pixels. No automatic model retry. Tests use adapter mocks; actual CDN/WASM/model inference in Canvas requires manual QA. Try-on regional protection not implemented because generated output registration may differ. License references: https://github.com/google-ai-edge/mediapipe ; https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf ; https://www.npmjs.com/package/@mediapipe/tasks-vision .

Explicit point selection is available before or after center detection. Model loading is serialized; timeout does not start another initialization. User consent is per photo workspace. Reconfirm compatibility and performance on actual phones; do not describe local vision as verified until real inference is observed.

## Vision feedback incident
Owner screenshot shows zero mask points, valid upload, disabled process and no detection status. Root cause of missing inference not proven; native confirm may be suppressed in Canvas iframe. Replaced native dialog with explicit action disclosure and visible live feedback, plus separate process blocker reasons. Chromium smoke substitutes a vision fixture to exercise success and failure UI without a native dialog; not actual MediaPipe runtime evidence. Failed redetection retains previous valid mask. Actual Canvas model load still pending.

## Simplified photo workflow
Owner reported manual point selection extracted only a small facial region. Default process now triggers local segmentation automatically when no valid selection exists. Person mode uses documented SelfieSegmenter foreground category 1; object mode uses MagicTouch center seed, with explicit type selection. Correction tools collapsed; original preview visible. Masks covering less than 3% of preview are rejected as a conservative heuristic, not whole-person verification. Failed automatic detection stops before background generation; no automatic generative substitution. User review retained. Selfie model URL follows official documentation (latest alias, not immutable); license Apache 2.0 per model card. Browser tests mock both segmentation engines; real Canvas load and quality remain pending. https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter

## v0.3.0 isolated profession candidate
11 new tools added with professional skill, field semantics, two presets each, task methods, output headings and manual review. Quiz additionally validates exact number/order, answer reasoning and integer weight total 100; these checks do not establish subject-matter correctness. Editorial images are illustrations only; news verification is a checklist, not internet fact-checking. Avatar is generative stylization (no deterministic identity guarantee), comic is a single four-panel image. Requires actual Canvas QA before promotion; existing P0 vision pilot and production policy remain open. No integration with Ngulik Digital Member.

## v0.3.0 photo/editor expansion
13 additional photo tools use existing image-to-image engine and explicit task-scope exceptions (hair, expression, style, sketch material, vehicle cosmetic changes, etc.). Reference review is mandatory. These are generative concepts, not guaranteed pixel preservation or actual regional inpainting. Object removal uses text description, outpainting uses generative extension, viewpoint is constrained by visible geometry, pas photo does not certify official document acceptance. Image-to-Prompt is deferred: existing bridge text route does not accept images. Existing photo products serve affiliate use cases; no duplicate alias added. Real output quality and 360px catalog usability remain open. No promotion of v0.3.0 without P0 acceptance.

## Unified candidate — 26 November 2026
Merged the 24-tool expansion into loader-hardening on top of the simplified UX. Both histories retained. The branch is the sole active development candidate; old release branches are retained as rollback/reference checkpoints, not parallel development targets. No stable or preview change yet. Live inference and commercial release gates remain open.

## Unified beginner-first interface
Mobile bottom rail contains seven registry categories, assistant, search and session results instead of forty individual buttons. Required briefs and a small set of primary controls remain visible. Advanced settings include optional fields and correction tools. Default preserve mode uses existing alpha or automatic local segmentation, with no manual drawing required. Pure processing router chooses local sharpening, solid/transparent local composition, hybrid background-only generation or explicit generative edit. No simulated output in production; tests use fixtures only. Precision mode retains source dimensions and does not expose unsupported crop/lighting. Model load, complete object selection and quality remain live Canvas gates.

## Canvas live incident — 26 November 2026
Owner reported host error overlay with XNNPACK informational line classified as CONSOLE_ERROR. Graph start and close observed, no valid mask or output confirmed. Scoped adapter reclassifies only the exact known informational stderr line to info, preserves all other console errors and restores the prior console handler. Callback validation errors propagate outside the WASM callback; handled application errors use warning and visible stage-specific messages. The 4MP bound is checked before segmentation for preserve mode. Real Canvas retest required. No change to model/provider or fallback policy.
