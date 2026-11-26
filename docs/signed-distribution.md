# Signed distribution — migration design (candidate only)

Prototype, NOT active. Existing shell, Pages pointers, AI bridge and LKG unchanged. No production key or signature. Unit tests generate nonextractable ephemeral keys in memory.

## Envelope v1

Exact object {payload,signature}. Canonical UTF-8 JSON array: domain "linggau-ai-studio:release:v1", then schema=1, keyId, channel, sequence, commit, version, entry, minShellApi, maxShellApi, bridgeApi, releasedAt, inventorySha256. Signature: unpadded base64url of raw 64-byte ECDSA P-256 SHA-256 r||s, not DER. All payload fields strictly validated. No envelope-supplied public key accepted.

## Migration requirements

1. Establish independent offline owner key custody, backup/recovery and trusted public-key pin in reviewed shell, not mutable remote code. Never use test keys in production.
2. Define deterministic first-party file inventory (path, length, SHA-256). Prototype signs inventory digest but does not fetch/enforce contents. Third-party WASM/model dependencies require separate review.
3. Sign only reviewed SHA after all CI and manual gates; never auto-sign on push. Publish separate signed endpoints and test isolated Canvas first.
4. Signed mode must fail closed, no unsigned/debug fallback; reverify signed LKG before use in separate storage namespace.
5. Per-channel sequence increases; authorized rollback signs old reviewed SHA with NEW sequence. Provision trusted floor in shell. LocalStorage can be erased; first-use replay, equal-sequence conflicting payload, expiration, revocation and rotation remain unresolved.
6. Native import may refetch after preflight; inventory verification alone does not bind bytes to execution. Review verified execution and transitive module graph or explicit trusted-CDN threat model before production security claim.

Signed manifest is not commercial access control or protection against compromised shell or key. Product gate remains failing, NO-GO. No migration or real key provisioning in this change.

## First-party inventory v1 prototype
Inventory is {schema:1,commit,files:[{path,size,sha256},...]}; strict ASCII relative paths, sorted lexically, unique records, mandatory manifest.json and src/app.js, bounded 512 files / 16 MiB per file / 64 MiB total. Canonical digest is SHA-256 over UTF-8 JSON array ["linggau-ai-studio:inventory:v1",1,commit,[[path,size,sha256],...]]. The digest is bound to the signed envelope. Build from exact Git tree blob bytes, not checkout; symlinks and unsupported modes rejected. CI verifies inventory file set, checkout bytes and remote immutable CDN bytes. Prototype can verify supplied inventory and individual bytes; no runtime imports, publication or signature in this stage. Full completeness is established against Git in CI, not by an untrusted inventory alone. Third-party assets, transport response-size hard caps, verified execution, replay and signed LKG remain open.
