# TASK-008 — Audit ingestion and scoped history contract

23 October 2026. Issue [16](https://github.com/Dihoccode1/Vinlook/issues/16). Approved owner Tú; reviewer Duy. TASK-007 merged a3d46e9214b083f628dd48a80e756ada40939175. Proposal A fills missing transport/action/cursor semantics under Master Prompt Rule1; no TASK-008 code yet. AI assistance does not impersonate Tú or replace Duy's human review.

## Existing approvals

Identity owns durable audit history; Content owns its future transactional outbox. Only authenticated Content delivers events; worker/browser/Usage cannot ingest. Repeated delivery must not duplicate history. Preserve actor, original session and occurredAt despite delayed receipt or later account/session changes. Staff sees own data, Manager all approved history. No audit TTL/deletion, cross-service DB access or fake exactly-once/cross-service atomicity.

## Proposed A — Receiver

`POST /api/v1/internal/audit-events`, no query inputs. Reuse scoped Content credential/rotation from TASK-006 and its headers. Authenticate the caller before parsing; reject any Origin, unknown/Usage/worker caller and staff-JWT-only access with generic401. No new secret or public ingestion route. Strict JSON16KiB ceiling.

Payload fields only: `eventId` UUID; `actorId` ObjectId; `workSessionId` ObjectId; `action` from registry below; `poiId` ObjectId; `occurredAt` canonical UTC ISO timestamp; `result:{status:succeeded|failed,errorCode:null|allowlistedCode}`; optional `reason` trimmed1–500UTF16 code units/Unicode codepoints or null. Reject actorType/operatorId/receivedAt/targetAccountId/client role/token fields. Identity supplies actorType=account, receivedAt=server now and nullable irrelevant fields. No raw exception/provider response in result/reason.

Proposed Content action registry: `poi.create`, `poi.update`, `poi.delete`, `poi.restore`, `revision.submit`, `revision.return`, `revision.publish`, `content.review`, `job.create`, `job.retry`, `job.complete`. Registry names express already approved operations, not extra public features. Failed result errorCode is one of `VALIDATION_FAILED`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE`, `PROCESSING_FAILED`; success requires null. Future adapters map provider/internal failures to these safe codes, never forward raw errors. Existing `work_session.close` is Identity-local only; operator/account-management events remain local future tasks.

Verify referenced actor exists and session belongs to that actor. Do not require actor to remain active, session to remain open, or receipt to remain on the original day: committed delayed/job events still belong to the original session. occurredAt must not precede original openedAt or be later than receipt; it may be after closedAt for asynchronous work tied to that original session. No current-role check retroactively invalidates history. Content is trusted to retain previously verified business context; this receiver cannot independently prove a POI commit or historical role. POI ID remains a logical reference, not a cross-DB lookup. No browser payload is forwarded directly as trusted outbox data.

First valid insert201 `{data:{eventId,receivedAt},requestId}`. Exact replay200 with the original receivedAt. Same eventId with changed normalized semantic fields409 `AUDIT_EVENT_CONFLICT` / "The audit event conflicts with an existing event"; never overwrite. Compare canonical stored payload excluding Identity receivedAt/_id, not insertion order/raw JSON. Unique(eventId) resolves concurrent delivery; bounded3 application attempts for insertion/read contention, otherwise503. No new payload-hash field/collection. Invalid references/fields422, malformed JSON400, oversized413, DB/dependency503. Safe UUID envelope and no-store; no credential/event bodies logged.

## Proposed A — History queries

`GET /api/v1/work-sessions` and `GET /api/v1/audit-logs`: current Bearer authority via TASK-006/007; no open session required just to read. Existing exact frontend CORS/no credentials. Return `{data:{items,nextCursor},requestId}`. Default limit20, integer1–100. Strict scalar query allowlist; duplicate keys/unknown fields/invalid dates/IDs/cursor422. No arbitrary Mongo filter/sort/search object.

- Sessions filters: `staffId`, `dateFrom`, `dateTo`, `status` (open|closed), `limit`, `cursor`. Date bounds inclusive real YYYY-MM-DD Vietnam dates; reject reversed range. Sort workDateVN descending, then _id descending. Output `{id,staffId,workDateVN,status,openedAt,closedAt}` only. Reconcile stale records for the query's authorized scope before returning; it must not report a prior-day session as open. Manager all-scope reconciliation is an explicit read-triggered extension of TASK-007, with the same midnight timestamps/no scheduler.
- Audit filters: `staffId` (actorId), `workSessionId`, `poiId`, `action`, `actorType` (account|operator), `dateFrom`, `dateTo`, `limit`, `cursor`. Dates filter occurredAt over the corresponding inclusive Vietnam days, not receivedAt. Sort occurredAt descending then _id descending. Output existing safe event fields: id,eventId,actorType,actorId,operatorId,workSessionId,action,poiId,targetAccountId,reason,occurredAt,receivedAt,result. No joined email/name/account secrets; no real operator credential ever stored as operatorId (alias only).
- Staff scope is always actorId/staffId=verified account, actorType=account. A foreign staffId or operator filter returns403; own explicit ID is allowed. Foreign/nonexistent workSessionId is404 with the same message. Manager may view account and operator events and filter other staff; no Manager ownership override for session close is added. Combinations retain server scope even when a cursor is supplied.
- Cursor is an opaque canonical base64url JSON token containing version1, endpoint, verified requester ID/current role, normalized filters (excluding cursor/limit), and last sort pair. HMAC-SHA256 signature uses a domain-separated derived key from existing private rate HMAC key; no new secret. Reject bad signature/shape/endpoint/requester/role/filter binding422; never accept cursor-provided authorization. Decode and bound cursor length at2048characters before parsing. Fetch limit+1 to determine nextCursor, null at end. Stable tie-break by _id; pagination is a live keyset view, not a frozen snapshot of later arriving events. Key rotation can invalidate cursors and require restarting the list. No new index/migration or count-total promise here; performance must be measured later.

Operator events already stored by approved local workflows remain visible to Manager only. Remote Content ingestion cannot create operator or account-management/session-close entries. This task does not create public operator/setup/recovery endpoints or arbitrary local writer API; later runbooks use the approved AuditLog schema and designated local event registries.

## Tests and limits

Guarded fresh TASK-008 loopback Mongo replica set and synthetic service credentials/accounts/operator aliases. Prove strict/authenticated ingestion, exact/conflicting/concurrent replay and restart persistence, delayed closed-session/locked-actor acceptance without reassignment, invalid refs/timestamps/codes, no operator spoof; Staff/Manager session/audit scoping, filter/cursor tampering/reuse/role changes/ownership, equal timestamp tie-break and Vietnam date edges, midnight reconciliation, safe dependency failures. Run relevant existing regressions/build/smoke. No real Atlas account or Content POI/outbox integration is implied by fixture delivery.

Content outbox implementation/sender remains later work; UI/Manager account APIs/hosting/CI/CD remain separate. Overall readiness503. Keep approved Tú-owner/Duy-reviewer assignment; no impersonation or permission changes. Open draft PR after actual checks, human review/merge before Done.

## Decision

Approve A together (receiver payload/action/error registry, replay conflict semantics, historical session acceptance, scoped filters and signed cursor, Manager query reconciliation), or specify changes. These are previously unspecified API/data details that require approval under Master Prompt Rule1; TASK-007 does not need another approval. Do not send real keys in chat.

Approval: Duy approved A (implement and test),23October2026. Proposal text above retained as history.
