# TASK025 remaining model preparation

25 October 2026 UTC+7. Duy implements, Tu reviews. Source PR55 merged. Metadata-only preparation authorized; no weights acquired here.

## Verified metadata

`task025-remaining-model-manifest.json` records the exact existing registry revisions for hi/es/ar/fr/bn/id/ur/ru/de/pcm/vi. All eleven revision responses matched the pinned revision, with exactly the five required files found. Each entry records sizes and provider SHA256 for LFS or Git blob SHA1 for small files. Total transfer 1,597,661,068 bytes (about 1.49 GiB), excluding transport and Docker layers. Metadata source URLs are embedded per model. No `.bin`/pickle, remote code, token or arbitrary model selection. Existing educational/noncommercial license restrictions retained.

Initial sandbox metadata requests failed; explicit outbound public-metadata access succeeded. No weights, synthesis or provider audio calls. Host C drive free space observed 129,325,133,824 bytes; Docker volume backing-store capacity remains unverified and cannot be inferred from that number.

## Proposed next implementation and acquisition (approval required)

Extend the separate explicit acquisition utility to selected locales from this reviewed manifest; retain English command compatibility, plan default, exact size/hash checks, exclusive lock, atomic promotion and verified cache reuse. Do not change normal worker check/run or prepare-models into an implicit downloader. One model at a time; fail closed on partial/unknown content and uncertain download, no automatic retry/delete. Calculate installed-file SHA256 manifests and verify offline after installation. Review implementation/tests before real acquisition.

After implementation verification, acquire exactly these eleven models into a separate task-owned volume, not the retained English volume. Proposed minimum free space in that target: 3 GiB before starting; this covers the approximately 1.49 GiB final cache and a single approximately 139 MiB staging model with headroom, excluding image layers/output. Verify volume capacity first and stop below threshold. No inference/audio batch, Atlas/Cloudinary/Gemini or production activation included. Those require live prerequisites and explicit job scope separately.

## Live environment readiness

| Item | Evidence / next check |
| --- | --- |
| Repository narration | Canonical source and eighty source hashes reconciled by PR55; no DB textVersion yet |
| Actual Content/Identity HTTPS origins | Not established by repository examples; need actual origins before read-only health checks |
| Content-owned collections/indexes and catalog | Not verified; no database writes performed |
| Dedicated worker/service identities | Contract exists; private setup and authorization checks pending |
| Cloudinary binding | Example settings exist; actual backend binding/media receipt not verified |
| Gemini Free project and model quotas | Need actual project tier plus RPM/RPD/TPM for both pinned models, without exposing key |
| Worker release image | Previous canary used verified runtime with source bind; fresh production build remains unverified |
| Human audio review | User has not listened; old canary uses old source and is not a final batch asset |

Google's [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits), read 25 October 2026, directs checking active project limits in AI Studio. Limits apply per project and vary by model/tier. Record actual numbers and observation date before setting caps; never substitute published sample limits. Existing seven-day confirmation requirement remains. Do not post API keys or database passwords in chat.

Approval requested: implement/test the selected-locale acquisition utility and then acquire exactly the eleven manifested models under the stated disk/volume guards. No automatic expansion to synthesis or cloud batch. Issue52 remains open, 0/80 final pairs.

## Approval recorded

25 October 2026: user explicitly approved implementation, testing and acquisition of these eleven models. User confirms Content/Identity HTTPS and Gemini project quota evidence are not yet available. This approval does not include audio generation or cloud activation.
