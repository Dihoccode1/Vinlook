# TASK025 — Upload recovery verification

26October2026 UTC+7. Duy implements, Tú reviews. User-approved A1, isolated implementation only.

POST /admin/jobs/:id/resume-upload is Manager/open-session-only. Strict input binds attempt, media, editVersion and bounded reason. Existing transaction/idempotency covers compare-and-set lease, per-job uploadResumedAt marker, parent version touch, audit outbox and replay response. Uses existing job.retry audit with resume-upload reason; no Identity change. New operation job.upload_resume and result status running support replay. No new collection/index/dependency/backfill. Legacy missing marker treated as null; retry never clears marker.

Local6jobs unit tests and20jobs integration tests passed on a fresh labelled Docker Mongo replica set removed afterward. New tests: Staff HTTP denial; exactly one recovery/replay without lease extension; changed input conflicts; second key denied; live/wrong/reclaimed/retried/foreign-media/version/source rejected; audit failure rolls lease and editVersion back; concurrency with expired worker claim accepts only one attempt; fixture reconciliation/result attaches existing asset with unchanged upload count. Existing media/lease/stale-output/rollback/default-process regressions pass. Provider synthetic; no real Atlas/Cloudinary call or lease mutation.

Reviewer focus: one-time marker retained after retry; same attempt/source/media guards; identity of Manager audit vs original worker job session; transaction conflict with claim/result/edit/delete; unchanged provider byte/hash checks; no worker automatic lease resurrection. Hosted canary remains unresolved until review/CI/merge/deployment and specific live resume. CI/build pending separately. TASK0250/80finalpairs.
