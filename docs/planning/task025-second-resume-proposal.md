# TASK025 — Bounded second recovery after metadata bug correction

## Approval recorded

26October2026 user explicitly selects A: maximum2recoveries/job with durable counter, no index/backfill, isolated implementation and Tú review before live write. Historical optionB below is not selected. uploadResumedAt retained and legacy marker counts as one even with missing/default0 count; no reset/decrement endpoint.

26October2026 UTC+7. PR64 metadata fix deployed/HTTPS verified. Original file/hash and Cloudinary asset exist; prior permitted resume was consumed while duration metadata was missing. Current contract maximum1/job blocks any second invocation, intentionally. User's generic approval to continue does not specify how to alter that limit.

## A — Explicitly raise per-job maximum to2 (recommended)

Implement/test a durable uploadResumeCount (integer0–2, default0, no index/backfill), retain uploadResumedAt as last recovery time. For legacy documents with uploadResumedAt set but count missing/default0, effective count is at least1; missing marker/count means0. Resume admission allows effective count<2 and all current guards, including running/audio/localworker/originalattempt/expiredlease/zero retries+reclaims/exact known media/current source+text+registry/expectedEditVersion. Compare-and-set marker and raw count (including missing) with lease; write effectiveCount+1 and timestamp atomically with parent touch/audit/idempotency. Manual retry/result must never clear counter or timestamp. Exact replay never spends an extra count or extends lease; a fresh key cannot exceed2. No decrement/reset endpoint or ad-hoc Atlas update.

After review/CI/merge/deployment, separately authorize one second live resume of known job/attempt/media, using then-current editVersion2 (if authenticated preflight confirms). Immediately reconcile existing journal once; no synthesis/upload/new job, strict metadata/SHA256 unchanged. A third recovery remains refused. This is a change from maximum1 to maximum2 for all jobs governed by this endpoint; do not disguise it as a one-record data patch.

Benefit: small extension of reviewed mechanism, preserves full audit and corrects consumed attempt history. Tradeoff: slightly larger allowed recovery budget and new schema counter; requires focused regression/concurrency/legacy tests.

## B — Keep maximum1 and retain unresolved job

No API/schema change or repeated recovery. Preserve local/Cloudinary evidence, canary remains incomplete. A different completion API or reupload would require separate design; no forced verified state or lease bypass.

Choose A (implementation/isolated tests, Duy owner/Tú review, no live write) or B. Rule1 Master Prompt requires explicit decision because recovery limit/schema/API behavior changes. Current approval does not authorize counter resets, live lease write or new upload. TASK0250/80finalpairs.
