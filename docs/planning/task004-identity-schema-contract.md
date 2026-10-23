# TASK-004 — Identity schema implementation contract

Date:23October2026. User reviewed TASK-004. D-004/D-005/D-007/D-014/D-017/D-021 approve entities and behavior; the implementation details and catalog omissions below need confirmation under Master Prompt Rule1 before code/database changes.

## Approved behavior preserved

- Five Identity-owned models: StaffAccount, WorkSession, AuditLog, RecoveryCode, AuthRateLimit. ObjectId references stay within Identity except logical poiId; no cross-database populate.
- Staff role Staff/Manager, status pending/active/locked; normalized unique email; fullName1–100Unicode codepoints, email≤254characters; no plaintext/confirmPassword; authVersion integer≥0.
- WorkSession unique staffId/workDateVN; real calendar date YYYY-MM-DD, open/closed; closedAt null when open, present and≥openedAt when closed. Reopening the same day retains the same ID. Cross-document account/state/day decisions belong to APIs, not a misleading schema-only proof.
- Audit eventId unique, original occurredAt distinct from receivedAt. Exactly one actor type: account with actorId, or operator with operatorId. workSessionId null only for previously approved outside-session operations. Existing session/actor/time indexes retained; no TTL deletion of audit.
- Recovery stores hash only; issuer is exactly one account issuedBy or issuedByOperator. usedAt null initially. API must check expiry and atomic one-use even if a record still exists, and invalidate old codes when issuing a replacement. No recovery TTL.
- Rate counters use HMAC identity keys, never raw IP/account. Expiry is enforced in API; TTL only cleans allowed expired rate records.

## Proposed implementation details — approve together as A

| Area | Concrete proposal | Reason |
|---|---|---|
| Collection names | staff_accounts, work_sessions, audit_logs, recovery_codes, auth_rate_limits | Explicit stable names, not Mongoose pluralization guesses |
| Audit target/reason | Add nullable targetAccountId:ObjectId and reason:String; require both on operator Manager setup/recovery events; account/POI events may leave them null | D-014 requires target account/reason, but the consolidated AuditLog field list omitted them |
| Audit action/result | action is required bounded string (1–100 characters); each writer/API later applies its approved operation allowlist. result is strict subdocument `{status:'succeeded'|'failed',errorCode:null|string}`; require safe errorCode when failed, null on success | Avoid untyped Mixed payloads and premature invented global action names; no arbitrary provider/error objects |
| Operator identity | operatorId/issuedByOperator are nonempty operator aliases1–100characters, not credentials or manufactured Staff accounts | Implements already approved account/operator distinction |
| Audit reason/error bounds | reason1–500characters when present; errorCode1–100characters, machine-code form letters/digits/underscore only | Bound stored fields; reject secret-bearing/free-form exception objects; actual operation writer must still redact sensitive input |
| Recovery hashing | SHA-256 represented as64lowercase hex characters; expiresAt finite Date, usedAt optional Date≤expiresAt | Encoding was not previously fixed; hashing algorithm already approved.15minute issuance enforced at API because there is no approved issuedAt field |
| Rate key/index | HMAC-SHA-256 lowercase hex64; unique(key,windowStart); TTL(expiresAt,expireAfterSeconds:0); count integer≥0 | Supports atomic fixed-window counters; TTL cannot authorize a request and is not exact-time cleanup |
| Hash storage | passwordHash must have bcrypt cost12 format; hidden by default; codeHash and rate key hidden by default | Prevent plaintext storage/accidental API projection. Do not generate a real password or claim synthetic hashes authenticate |
| Strictness/runtime | strict:'throw', no autoCreate/autoIndex; no implicit Mongoose version key or new timestamps beyond the catalog; Staff createdAt/updatedAt only. Index deployment is explicit in an isolated test | No silent fields, implicit production writes or accidental schema/index drift |

No new issuedAt/target collection or raw request snapshot is added. Pure schema validation does not prove immutability, atomic recovery consumption, allowed state transitions or actual DB index execution; later APIs own those rules with transactions/conditional updates.

## Test plan after approval

Use Mongoose9.11.3 (registry engine supports Node24) with exact lockfile. Docker engine29.8.2 observed available after read-only permission check. Prepare one disposable local Mongo8.0 replica-set test container with a verified official image version/digest, loopback-only mapped port and synthetic database. Never use Atlas/project secrets. Do not modify other existing containers/volumes.

Test required fields, no unknown/password fields, conditional actor/issuer rules, date/state consistency, hash/integer bounds and safe validation summaries. On actual test Mongo, explicitly create collections/indexes, verify duplicate normalized email, duplicate staff/day and duplicate event/window rejection, and prove schema hooks/API-conditional mutation limits honestly. Inspect TTL definitions without falsely asserting cleanup occurs at an exact second. Retain actual test report; cleanup only the task-owned disposable resources. Follow with build/runtime regression checks and review PR.

## Decision

Approve A in full or specify changes. Particularly approve the two additional AuditLog fields, typed result shape and rate-key/index encoding above. No schema code or Mongo container created at proposal stage. This does not authorize production DB mutations, real account creation, auth endpoints or deployment.

## Approved — DEC-122

User approves A, including added targetAccountId/reason, typed result and hash/rate-index details. The pending/no-code wording above is historical proposal state. See task004-implementation-evidence.md for actual execution; no auth API or production DB acceptance inferred.
