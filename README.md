# Linggau AI Studio — 0.2.0 candidate

Clean-room modular workspace; no npm, build, GAS, database, telemetry, or personal API key.
Active main/release remains 0.1.0 until QA and tag publication. Candidate branch release-0.2.0.

## Architecture
Canvas shell owns provider transport, model allowlist, empty key, one in-flight request, 120s abort, error handling; external modules are trusted executable code, not isolated by lexical scope. CDN module owns feature registry, prompts, inputs and session assets. The three engine methods are editImage, generateImage, generateText. Feature metadata lives in src/features/index.js; forms generated from schema. Ordered image slots define reference roles. Text output uses human-readable, tool-specific section contracts, not JSON. Image aspect ratio is forwarded only when explicitly selected; actual dimensions depend on provider. Universal Lock is prompt-level, not deterministic masking.

## QA
Run Node 22: node --experimental-default-type=module --test tests/*.test.js
CI uses mocked provider calls only; no real inference or charges. Manual Canvas tests: copy reviewed canvas/shell.html into a NEW test Canvas, set PREVIEW_REF to the full reviewed candidate commit SHA (not a mutable branch). Verify all sixteen tools, two reference slots and reuse of model in Virtual Try-On, image download, text copy/manual selection, invalid upload clears previous source, 401/403/429 guidance, no auto retry, history clear and 360px layout. Verify on two accounts. Use non-sensitive test images; obtain consent for human images. AI model creation is for fictional adults; try-on is for consenting adults. No API key or billing. Text and multi-image engines have produced real outputs historically; candidate quality and ratio compliance require manual retest.
Once accepted, merge only after release tag is prepared at the tested commit; publish 0.2.0 and ensure manifest points to published release. In the durable Canvas set PREVIEW_REF="" and test stable path. Subsequent release can change manifest without changing shell/link if shellApi compatible. CDN cache can delay changes. Old 0.1.0 Canvas shell cannot load shellApi 2 without a one-time migration. Rollback: restore manifest 0.1.0; new shell handles both contracts. Do not rewrite tags. No claim of unlimited free usage.

Session history bounded to 10 results and 32 MiB encoded content; temporary input and DOM memory are additional. Original input files aren't stored in history. Result reuse is image-to-image only, with source asset lineage. User images sent to Google on explicit process action; no guarantee of provider retention policy. No HEIC yet. No commercial distribution until policy/quota and cross-account validation.

## Preview update channel
The shell supports a fixed preview-channel branch pointer channel.json with shellApi 2, version, entry and a reviewed full commit SHA. Update that pointer only after CI succeeds. The shell imports the pinned commit, not mutable module files. Reopening or refreshing the Canvas loads the pointer subject to CDN cache propagation; no live hot-reload or session preservation. Stable continues to use main manifest and release tags. Explicit PREVIEW_REF overrides the channel for debugging. One-time shell replacement required. The manual fallback points to 1340f04 (previously exercised workspace). A passing CI does not establish actual Canvas or provider quality.

## Quality system
All 16 tools have a professional skill profile, explicit parameter semantics and a three-point manual review rubric. The prompt compiler rejects missing rules; source fidelity takes precedence over stylistic changes. Local output checks report decoded dimensions, requested aspect ratio tolerance (3%) and ordered, nonempty text sections and tool-specific cardinality/timing checks. These are not semantic, OCR, factual or identity verification. The result panel shows manual review criteria and original references for the current job. Users may adjust controls and explicitly regenerate; no automatic second inference. History retains prior results within its existing memory limits. Visual acceptance remains a manual QA gate.

## P0 acceptance
See [manual QA ledger](docs/p0-acceptance.md). One generate produces one final deliverable; no alternatives or automatic AI retry. Preview promotion only after CI; commercial release remains blocked pending actual runtime QA and policy review.

## Mutable pointer refresh correction
The original shell fetched the mutable preview pointer from jsDelivr, whose branch cache can last 12 hours. The revised shell reads mutable manifests directly from public GitHub Raw, with browser cache disabled, and imports executable modules only by reviewed immutable commit or release from jsDelivr. GitHub Raw may still cache or fail in Canvas; no instantaneous freshness or CORS guarantee. No automatic stale-manifest fallback. A one-time shell migration and runtime verification are required. The existing manual recovery remains available. See https://github.com/jsdelivr/jsdelivr#caching.

## Productivity home and session assets
Home is a text-only conversational assistant using the existing text bridge; one request per send. Up to eight completed turns and 100,000 characters in memory, with only recent whole turns fitting the 12,000-character prompt limit transmitted. No browsing, tools, Gmail identity, persistence or cloud sync. Assets remain temporary for chaining and download; clear session deletes local in-memory chat and assets, not provider records. Separate catalogue and mobile overlay navigation plus input/result tabs. Neo-Brutalism uses independently implemented styles aligned to Ngulik's palette, with a vector trace of the owner-supplied logo. No integration or database change. Runtime QA still required.

## Mobile navigation and assistant skill refinement
Mobile uses a fixed horizontally scrollable navigation rail containing assistant, session assets and every registered tool. Desktop retains category sidebar. Duplicate catalog page and drawer removed; tool input/result tabs retained. Assistant uses one adaptive multidisciplinary prompt with professional task methods, factuality, capability and privacy constraints; no extra model calls or actual external tools. Privacy information is available in a compact expandable note. Session/history limits remain unchanged. Real model adherence and mobile rendering require Canvas QA.

## Compact mobile refinement
Equal-height parameter grid tracks, fixed two-column mobile choices (three ratio columns), controlled typography and compact single-line 44px mobile navigation targets. A 32px bottom host clearance is reserved based on owner screenshots showing Gemini's floating control overlapping the old rail; actual host/device layout still needs verification. Remove the pre-generation quality rubric from the UI; skill contracts and local checks remain unchanged. Only structural warnings are surfaced in result details; privacy information remains available on demand. No change to engines, parameter values, storage or feature count.

## P0 craft and preset refinement
Each of the 16 tools has two optional preset combinations of existing parameter choices and a distinct production method. The compiler adds conditional interaction rules for source framing, background, light, garment, copy and factual constraints. Presets never change user text, input images or generate automatically. Empty optional text is explicitly omitted; user text is quoted as data. Auto aspect ratio on reference edits is checked against decoded source dimensions when available. Prompt instructions and ratio warnings are not identity or aesthetic verification. No expansion of registered tools until real P0 acceptance is recorded.

## Hybrid precision pilot
See P0 ledger. Local sharpen uses bounded luminance processing, not AI reconstruction. Background and formal photo offer default manual polygon precision mode (source dimensions, solid or generated empty backdrop, PNG). Only opaque, fully selected decoded pixels are copied exactly; transparent/edge pixels are composited. Source photo stays local in precision mode; custom backdrop may be sent to Gemini. No automatic segmentation or face verification. Generative mode remains an explicit alternative, with existing review gate. Local 4 MP / 4096px limits and 8MB output cap fail closed. Browser QA required.

## Loader hardening candidate
See [loader audit and contract](docs/loader-hardening.md). This branch supersedes old loader instructions only after a separately tested shell migration. No automatic migration of existing Canvas HTML.
