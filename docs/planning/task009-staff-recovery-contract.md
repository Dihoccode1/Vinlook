# TASK-009 — Staff lifecycle and recovery implementation contract

23 October 2026. Issue [18](https://github.com/Dihoccode1/Vinlook/issues/18). Owner Duy; reviewer Tú. TASK-008 merged e9b7bd5d83d44feeef066d02a6f863bcf3309707; TASK-006/007 prerequisites already merged. Proposal A fills missing implementation details under Master Prompt Rule1; no TASK-009 code yet.

## Existing approvals retained

Only current active Manager manages Staff; no role elevation, self-lock, other-Manager modification or first-signup Manager promotion. Staff accounts pending→active on approval, active→locked, locked→active on unlock. Recovery requires Manager verification before code delivery, random32-byte one-use code,15minute expiry, SHA256-only storage, new issuance invalidates old codes. Password keeps existing15Unicode codepoint/72UTF8-byte bcrypt12/exact-confirmation policy. Reset increases authVersion atomically, never auto-logs in/unlocks/creates a session. No email/SMS; operator Manager bootstrap/recovery issuance remains TASK-010.

## Proposed A — Manager endpoints

All under `/api/v1`, Bearer JWT/current Manager authority, existing exact-origin CORS/no-store/UUID/error envelope. No open work session required for these account-administration operations, which are distinct from content mutations. No caller-provided actor/role/time.

- `GET /staff`: only Staff accounts (no Manager records); filters `status` (pending|active|locked), `limit` default20/max100 and cursor. Strict scalar query validation, no body/free Mongo filters. Return `{data:{items,nextCursor},requestId}`, items={id,fullName,email,role,status,createdAt,updatedAt}. No password/code hashes, authVersion or credentials. Sort _id descending; reuse TASK-008 signed cursor mechanics with distinct staff endpoint, bound requester/current role/status. No new index/secret or total-count promise.
- `POST /staff/:id/approve`: strict `{expectedStatus:'pending'}`, transition pending→active.
- `POST /staff/:id/lock`: strict `{expectedStatus:'active'}`, active→locked.
- `POST /staff/:id/unlock`: strict `{expectedStatus:'locked'}`, locked→active.
- Target must be role Staff. Nonexistent or Manager target returns generic404 `STAFF_NOT_FOUND` / "Staff account was not found". Invalid ID/input422; stale/already-changed status409 `STAFF_STATE_CONFLICT` / "Staff account state has changed". Successful mutation200 `{data:{accountId,status},requestId}`. State commands do not silently replay an already-applied transition: after a lost response, reload current state rather than overwrite.
- Approve/unlock do not increase authVersion. **Lock increases authVersion once** as part of the transition, so a copied old token remains invalid after a later unlock. Lock does not silently expire an existing recovery code; reset while locked is allowed but leaves the account locked. No history/session deletion or forced cancellation of already-admitted operations.

## Proposed A — Recovery issuance and concurrency

`POST /staff/:id/recovery-codes`: current Manager, strict `{reason}` trimmed1–500UTF16 code units/Unicode codepoints. Target Staff active or locked; pending returns409 state conflict. Manager must verify the actual requester before invoking this operation; a reason field is an audit explanation, not technical proof of human verification. No checkbox/header can replace that responsibility.

Generate32CSPRNG bytes; deliver canonical unpadded base64url code (43characters) once. Store SHA256 of the **decoded32random bytes**, issuedBy=verified Manager, issuedByOperator=null, expiresAt=server issuance time+15minutes, usedAt=null. Expire every previous unused code with expiresAt=min(old expiresAt,now), preserving records without marking unused codes as used or extending already-expired codes. Insert new record and issuance audit in the same Identity transaction.

**Issuance also increases target authVersion once.** This both revokes any existing staff JWT immediately and supplies a real shared account write to serialize concurrent issuance/reset without a new generation/lock field. Conflicting transactions retry against the new state; after multiple successful issuances only the last committed code remains valid. This additional immediate logout is a proposed behavior needing approval, not an existing test result. Approve/unlock still do not invalidate JWT separately.

Return201 `{data:{accountId,code,expiresAt},requestId}` only after commit. Never persist/log/cache raw code, password, token or provider text. If the response is lost, the code cannot be recovered: Manager verifies/reissues; new issuance invalidates the old code. No GET-code endpoint, automatic retry or promise of plaintext replay. Keep current-session history intact.

## Proposed A — Public reset

`POST /auth/reset-password`: exact `{email,code,password,confirmPassword}`. Normalize email as signup, preserve password bytes. Valid password/confirmation policy required; semantic invalid input422. code is nonempty string bounded128characters; a noncanonical/wrong/expired/used/replaced code with otherwise valid input receives the same generic401 as unknown/noneligible account: `RECOVERY_FAILED` / "Password recovery could not be completed". No account/state/code-existence disclosure.

Find eligible active/locked account and unused matching hash whose expiresAt>now. Staff codes must be Manager-issued; Manager codes must be operator-issued through future TASK-010 (fixture-only proof here, no public Manager issuance). Pending cannot reset. After valid-code precheck, compute bcrypt12 and recheck code/expiry/status in the transaction at consumption time. Atomically write new hash, usedAt=now, increment authVersion once, expire other unused codes and append reset audit. Account role/email/status unchanged, including locked status. No token/session creation. Return200 `{data:{reset:true},requestId}`; no hash/token/code returned.

Concurrent reset/issuance must serialize on the same account version write. Exactly one reset may consume a code; losing attempts get generic401, unless the rate budget is exhausted429. A failed hash/audit/transaction does not partially consume a code or change a password. No transaction retry of an uncertain commit as a fresh reset. Use existing bounded maximum3 application contention attempts, otherwise503; never overflow authVersion safe integer bounds.

## Proposed A — Rate semantics and local audit

Retain approved reset budget **5failed attempts per normalized account per15minute UTC fixed window**, HMAC-scoped operation reset/account; success does not erase earlier failures. Precheck exhausted account before expensive work; every admitted wrong/noncanonical/unknown/ineligible/expired/reused/race-losing valid-input failure claims an atomic slot (at most5generic401, later429). Invalid password/confirmation input422 does not consume an account failure slot.

Add reset **IP30requests/15minutes**, matching login's existing IP budget, counted before parsing/validation/bcrypt. This is a newly proposed reset endpoint safeguard, not a previously measured quota. Existing proxy trust rules apply; no guessed Render ranges. Malformed400, oversized16KiB413, semantic422, rate429+Retry-After, DB dependency503. No in-memory rate fallback or permanent account lock from failures; TTL is cleanup only.

Audit writes are local and atomic with each successful change. Actions `staff.approve`, `staff.lock`, `staff.unlock`, `staff.recovery_code_issue`, `staff.password_reset`, `manager.password_reset`. For Manager commands actorType=account/actorId=verified Manager; targetAccountId=target; workSessionId/poiId/operatorId=null; reason from issuance or null; result succeeded/errorCode=null, server UUID/time. Reset actor is the account proven by its recovery code, including locked account; targetAccountId=self, workSessionId=null. Do not fabricate operator actor for the Manager's later self-reset; operator issuance audit belongs to TASK-010. Failed authentication/reset attempts remain safe durable counters, without storing submitted codes/passwords in audit. Remote Content cannot send any of these local actions.

## Evidence and limits

Guarded fresh TASK-009 loopback Mongo replica set, synthetic accounts/secrets/verification reasons and injected clock. Test Manager/Staff/locked/target-role/state gates, signed Staff listing scope/cursor, atomic audit rollback, lock+unlock old-token rejection, exactly32byte issuance/hash/expiry/new-code invalidation, concurrent issue/reset and one-use replay, password byte/Unicode/confirmation/bcrypt12, locked reset without unlock, expired/replaced/noncanonical/unknown code generic errors, operator-issued Manager-code fixture path, rate windows/concurrency/restart/fail-closed and existing regressions/build/smoke. Never create a real Manager or use Atlas/provider credentials.

UI, real human identity verification/delivery, operator bootstrap/issuance tool, production migration/hosting/CI/CD and complete product acceptance remain separate. Readiness503. After actual checks, draft PR for Tú human review/user merge.

## Decision

Approve A together, including **JWT invalidation on lock and code issuance**, account-write serialization, Staff listing, strict command state/error choices, code/hash/expiry/one-use transaction and reset IP30 budget; or specify changes. These concrete data/API/security choices were absent from the high-level design and need approval under Master Prompt Rule1. Existing TASK-008 review/merge is complete and needs no repeat approval. No private credentials requested.

Approval: Duy explicitly approved A (implement and test),23October2026. Proposal wording retained as history.
