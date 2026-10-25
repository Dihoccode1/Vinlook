# TASK025 — Worker-only review registry verification

26October2026 UTC+7. User approved A, isolated implementation only; Duy implements/Tú reviews.

Configured local-worker runtime now receives both existing frozen processingManifest and publicationRegistry. Gemini runner remains absent with CONTENT_GEMINI_ENABLED=false; no new configuration, endpoint/schema/index/dependency/pin. Existing verification and full16locale/thumbnail/geography/Manager/pointer publication requirements unchanged.

All23jobs integration tests passed on fresh labelled disposable Mongo replica set, removed after test. New end-to-end HTTP fixture starts connectContentRuntime with worker+media and Gemini false, queues exactly one pinned English job, claims/uploads/verifies original fixture audio, completes it, rejects review of corrupted CDN bytes without changing pending/editVersion, then approves valid English with reviewer/time/audit. Submit of incomplete one-language/no-thumbnail draft returns409PUBLICATION_NOT_READY and no published pointer. Runtime has no adapters and registry is frozen. Existing leases/recovery/media/idempotency/rollback regressions remain green. Provider fixture only, no real Cloudinary/Atlas calls or hosted review.

Reviewer: inspect static registry provenance and Gemini isolation; failed provider verification must not approve; English acceptance cannot publish an incomplete draft. CI production build/smoke pending separately. Human listening accepted1/80; hosted approved0/80 until separately authorized live review after merge/deploy.
