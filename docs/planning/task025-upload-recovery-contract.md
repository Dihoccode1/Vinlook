# TASK025 — Same-attempt upload recovery contract (proposed)

## Approved A1 and implementation clarification

26October2026 user explicitly approves A1. The one-time mechanism is now settled: nullable uploadResumedAt, no index/backfill, null/missing legacy documents eligible; marker retained across manual retry and result for a per-job maximum of one recovery. Historical unresolved/A2 discussion below is superseded. Input reason max485characters so 'resume-upload: ' prefix fits existing500character audit bound. Implementation rejects control characters. Returned data status running is added to Content replay-result enum; Identity action contract stays job.retry with prefixed reason. No live state change authorized by isolated implementation approval.

26 October 2026 UTC+7. User chose approach A. Duy implements, Tú reviews. This document resolves API/audit/idempotency details before code. Existing stale-attempt checks remain intact.

## Endpoint and request

POST /api/v1/admin/jobs/:id/resume-upload, Manager only, current open work session, existing Content-to-Identity authorization. Strict JSON: expectedEditVersion (nonnegative integer), attemptId (canonical UUID), mediaIntentId (ObjectId), reason (trimmed1–500characters). Idempotency-Key required. New Content mutation operation job.upload_resume; result uses existing data shape with poiId/revisionId/jobIds/editVersion and additive status running. No credential or provider URL accepted from caller.

## Admission and transaction

Require configured worker+media+registry. In existing transaction, job must be running/audio/local_worker; attempt matches, owner equals current configured worker ID, lease exists and is expired, retryCount0/reclaimCount0, no acceptedAt/resultRef/lastResultHash/error. Revalidate current draft/nondeleted POI, source/text/registry/model snapshot via current(), and exact expectedEditVersion. Bind MediaUpload ID to same job/attempt/POI/revision/language/sourceVersion/textVersion/registry/model, uploading/uncertain/verified, unattached, MP3/video, retained SHA256/positive bytes/start and duration90–150. Validate media document before accepting it; no forged reference.

Compare-and-set job exact status/attempt/owner/expired lease/counters to now+5minutes, preserving attempt/owner/requestedBy/original workSessionId and input snapshot. Touch POI/revision with existing optimistic concurrency to serialize edits/deletion/results; editVersion increments once. Audit attributes the recovery decision to current Manager/current session, while later worker completion retains original job session. Use existing accepted audit action job.retry with mandatory reason prefixed 'resume-upload: ' (reason input bound adjusted to keep final length<=500), so Identity requires no new action/deployment. Add new operation only to Content idempotency enum; no collection/index/model-field changes.

Mutation, audit outbox and replay response commit atomically. Same exact key/input replays without extending lease; changed request conflicts. An expired idempotency record must not silently permit extending the same attempt repeatedly: include recovery marker using existing audit outbox payload reason/job association only if reliable/queryable, otherwise add a dedicated durable one-time marker after separate approval. **This one-time mechanism remains a design choice to settle before implementation.** No acceptance from in-memory flags.

## Recovery execution and invariants

After isolated tests/review/CI/merge/exact-commit deploy, authorize the specific job/attempt/media/versions before live resume. Run original worker journal once; existing phase upload_started can only reconcile known intent then result. No synthesis/upload/new intent/new attempt, no provider resend acknowledgement. Metadata/original-byte SHA256 checks remain strict. Failed reconciliation retains state; no repeated Manager resume under a fresh key to bypass bounds.

## Required tests

Manager-only+session; wrong/current-live/reclaimed/retried/new attempt refused; stale source/text/model/editVersion/deleted/in_review parent refused; wrong-intent/metadata/digest/attached refused; exact replay changes no expiry/counter; changed-key second recovery refused durably; concurrent recovery/claim/result/edit/delete serialize; audit failure rolls lease/editVersion back; Gemini stays off; actual fixture reconciliation/result attaches original media once with no second provider upload. No real Atlas/provider calls in implementation gate.

## Outstanding one-time marker options

A1 recommended: add nullable uploadResumedAt on ProcessingJob, default null, no index. Guard null and set with lease in same transaction; preserve through result, clear only when explicit existing retry creates new attempt (or retain per job to limit further). Existing documents treat missing as null for admission. This is a new schema field requiring explicit approval; it is clearer than depending on delivered audit/outbox retention.

A2: skip one-time bound and allow repeated separately Manager-authorized extensions with version guards/audit. Smaller schema scope but permits repeated lease resurrection. Not recommended for this canary.

Approval requested: A1 contract, per-job marker retained across retry (maximum one upload recovery per job), no new index/migration/backfill; or A2. Contract implementation remains isolated; live state unchanged.
