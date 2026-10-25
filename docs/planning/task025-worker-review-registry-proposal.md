# TASK025 — Review local-worker English while Gemini stays disabled

## Decision

26October2026 user explicitly approves A: implementation and isolated tests, Duy owner/Tú reviewer. No live review/publication/provider call authorized by implementation approval. Registry stays existing pinned immutable data; verification and full16locale gates unchanged.

26October2026 UTC+7. POI001 English technical canary succeeded and user explicitly accepted full listening. Hosted reviewStatus remains pending. Source inspection: connectContentRuntime exposes processingManifest for configured worker but publicationRegistry only inside config.adapters (Gemini-enabled) block. createPublicationService requires approved registry plus strict media verification to approve audio; current worker-only hosted runtime therefore cannot approve the valid English row. Do not send a known-failing live review request or enable Gemini merely to expose static metadata.

## A — Expose existing frozen verification registry with configured worker (recommended)

When config.worker exists, assign both existing processingManifest and publicationRegistry to runtime. No new registry/models/pins, environment setting, endpoint, schema/index/dependency or provider execution. Gemini runner and Gemini credentials remain disabled. Existing approval revalidates Cloudinary metadata/original hash; current editVersion/textVersion/open-session/RBAC checks apply. Full submit/publication still requires all16current approved text/audio rows, thumbnail/entrance and existing Manager/geography/pointer guards; one English approval cannot publish.

Implement isolated integration test on actual worker-only runtime with Gemini false/media fixture: exact pinned English media can be approved via existing service, audit/version saved; absent/corrupt media fails; submitting one-language draft remains PUBLICATION_NOT_READY. Review may invoke read-only provider verification during eventual live operation, never upload or synthesis. PR/CI/Tú review before deploy.

After reviewed deployment, separately authorize exact POI001/en review API input using authenticated current editVersion and textVersion1. This records existing human listening acceptance in system, not approval of other locales or public release. No live mutation during implementation gate.

## B — Defer hosted approval until Gemini environment is enabled later

Keep current runtime; local human-review evidence remains accepted, system status pending. Avoid change now but postpones completion of the English review flow. No automatic Gemini activation.

Choose A (Duy implementation/isolated tests, Tú review) or B. Rule1 Master Prompt requires settling this previously missing runtime behavior; processing-only PR62 approval did not silently enable publication registry. TASK0251/80human-listening accepted,0/80system-approved at preparation.
