# Ngulik Digital Studio access client — candidate only

Backend candidate: Ngulik Digital branch studio-licensing-candidate, commit 7130932f70099bd40e4d9337e7841d7e7583c35e. Client accepts a one-use grant code obtained after portal authentication, never the portal session or WA OTP. Dedicated session is held in memory, not URL/localStorage. Exchange followed by validation; fail closed on denial, expiry or network loss; logout clears locally and distinguishes server confirmation. Strict GAS endpoint configuration and allowed redirect host. No runtime endpoint configured, no UI hook, no Canvas changes. The source transport is not a server authorization boundary.

Next steps: verify backend CI, explicit gateway route and deploy in isolated STAGING only after source/runtime audit, authenticated portal issue UI, actual Canvas form/abort/unmount on revocation/expiry, and independent real cross-origin tests. Before every protected Ngulik operation enforce server validation, never trust client access flags. Browser code and provider-owned Gemini runtime remain copyable; do not represent license as absolute control over copied local/host code. Do not expose secrets, encode authorization bypass or hide provider access. Immutable SHA distribution remains unchanged. No assumption that Starter Pack includes Studio, no price change.

## Shell source protection

Use a build-generated minified public loader; preserve explicit host apiKey declaration and supported host behavior. Percent encoding or obfuscation is reversible, not encryption. Test encoded shell separately before replacing any live shell; do not use document.write(unescape(...)) as a security boundary. Do not copy third-party source. ECDSA remains authenticity/integrity only, not confidentiality.
