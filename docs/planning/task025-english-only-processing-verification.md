# TASK025 — English-only processing verification

26 October 2026 UTC+7. User approved option A. Duy implements, Tú reviews.

Process accepts optional languages (nonempty unique supported locales); omission preserves16locale behavior. Existing idempotency request hash includes selection. Worker-only runtime receives pinned processing registry without enabling Gemini adapters or publication configuration. No schema/index/dependency changes.

Local validation:5jobs unit tests passed;17jobs integration tests passed on a newly created, labelled disposable Docker Mongo replica set (removed by runner). Includes exactly one English audio job, replay/selection conflict, invalid locale rejection and actual worker-only runtime connection/claim with Gemini disabled. Existing16job, lease, media result, rollback and stale-input tests passed. Provider/media transport is synthetic. No live Atlas/provider call, upload, inference or deployment. CI/build pending separately.

Reviewer: inspect runtime isolation and default compatibility, idempotency selection hashing, unsupported/duplicate locale bounds, and worker/source guards. This substep must not close Issue52 or claim any final text/audio pair. Live canary remains a separate bounded execution gate.
