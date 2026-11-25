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
