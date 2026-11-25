# Linggau AI Studio — 0.2.0 candidate

Clean-room modular workspace; no npm, build, GAS, database, telemetry, or personal API key.
Active main/release remains 0.1.0 until QA and tag publication. Candidate branch release-0.2.0.

## Architecture
Canvas shell owns provider transport, model allowlist, empty key, one in-flight request, 120s abort, error handling; external modules are trusted executable code, not isolated by lexical scope. CDN module owns feature registry, prompts, inputs and session assets. The three engine methods are editImage, generateImage, generateText. Feature metadata lives in src/features/index.js; forms generated from schema. Ordered image slots define reference roles. Text output is human-readable heading-based text, not schema-validated JSON. Image aspect ratio is forwarded only when explicitly selected; actual dimensions depend on provider. Universal Lock is prompt-level, not deterministic masking.

## QA
Run Node 22: node --experimental-default-type=module --test tests/*.test.js
CI uses mocked provider calls only; no real inference or charges. Manual Canvas tests: copy reviewed canvas/shell.html into a NEW test Canvas, set PREVIEW_REF to the full reviewed candidate commit SHA (not a mutable branch). Verify all eight tools, two reference slots and reuse of model in Virtual Try-On, image download, text copy/manual selection, invalid upload clears previous source, 401/403/429 guidance, no auto retry, history clear and 360px layout. Verify on two accounts. Use non-sensitive test images; obtain consent for human images. AI model creation is for fictional adults; try-on is for consenting adults. No API key or billing. Text model and multi-image/ratio support remain unverified in Canvas until manual test.
Once accepted, merge only after release tag is prepared at the tested commit; publish 0.2.0 and ensure manifest points to published release. In the durable Canvas set PREVIEW_REF="" and test stable path. Subsequent release can change manifest without changing shell/link if shellApi compatible. CDN cache can delay changes. Old 0.1.0 Canvas shell cannot load shellApi 2 without a one-time migration. Rollback: restore manifest 0.1.0; new shell handles both contracts. Do not rewrite tags. No claim of unlimited free usage.

Session history bounded to 10 results and 32 MiB encoded content; temporary input and DOM memory are additional. Original input files aren't stored in history. Result reuse is image-to-image only, with source asset lineage. User images sent to Google on explicit process action; no guarantee of provider retention policy. No HEIC yet. No commercial distribution until policy/quota and cross-account validation.
