# TASK-007 — Daily session implementation contract

23 October 2026. Issue [14](https://github.com/Dihoccode1/Vinlook/issues/14). Owner Duy; reviewer Tú. TASK-006 merged at99b63dd14162cc751c94ca0e8fa8260850eb2a15. This is proposal A for implementation details absent from the approved high-level design; no TASK-007 code yet.

## Existing approvals retained

One session/account/Vietnam day; active Staff and Manager open explicitly before content/pipeline/review operations. Manual close, reopen the same ID on the same day, logical closure at00:00 Asia/Ho_Chi_Minh, no deletion of history. JWT login does not create a session. Fresh authority checks remain mandatory; old-day sessions never grant current authority even while the host sleeps. Identity alone owns session data. No paid scheduler, keep-alive workaround or extra service.

## Proposed A — Endpoints and state

- `POST /api/v1/work-sessions/open`: Bearer JWT with current active authority; no query or JSON fields (accept absent body or empty object). Actor and day come only from verified principal and server time. If no session exists for that account/day, create open with openedAt=now, closedAt=null, return201. Existing open returns200 unchanged; existing same-day closed reopens with the **same ID and original openedAt**, sets closedAt=null, returns200. A lost-response retry while already open returns that same record, not a second session.
- `POST /api/v1/work-sessions/:id/close`: current active owner only, including Manager closing only their own session. Strict body `{reason}`; reason is trimmed1–500 Unicode codepoints and maximum500UTF16 code units to fit the existing AuditLog schema. No client time/status/staffId/day allowed. Current-day open transitions to closed with closedAt=now and returns200. Current-day already closed returns200 unchanged, without another close event; a retry cannot replace the original reason/time. Session ID must be valid ObjectId; malformed422, missing/nonowned404 with the same generic message. No Manager override or arbitrary historical close.
- Both return `{data:{session:{id,workDateVN,status,openedAt,closedAt}},requestId}`, with UTC ISO timestamps. No account/hash/token leakage. Strict validation422, malformed JSON400, body over16KiB413, missing/invalid/stale JWT401, inactive account403, DB failure503. Server-generated UUID, no-store and existing exact-origin CORS. No new public or internal diagnostic endpoint.
- Manual close stores the required reason in existing **AuditLog**, in the same Identity transaction as the close. Fields: eventId server UUID, actorType=account, actorId=verified owner, workSessionId=session, action=`work_session.close`, poiId/targetAccountId/operatorId=null, reason, occurredAt=receivedAt=close time, result={status:succeeded,errorCode:null}. This narrow local write avoids adding a WorkSession field or losing the reason. If either write fails, neither commits. Full audit ingestion/query/action registry remains TASK-008. No new open/reopen/automatic-close audit event is invented here.

## Proposed A — Midnight and races

- A session's logical end is next00:00 Vietnam (17:00UTC of its workDateVN). At/after that instant it cannot be reopened or used for current work. The next day requires a new session ID. Preserve original openedAt when reopening within the same day; closure intervals are not added as new schema fields.
- Reconcile the verified account's prior-day stored-open records on authenticated session/current-principal requests, including `/me` and internal authorization, and on Identity startup before accepting requests. Set status=closed and closedAt to that record's **next Vietnam midnight**, not delayed processing time. This is an explicit extension of TASK-006's read-only session lookup; account/role/version checks still precede request-triggered reconciliation. Startup reconciliation uses only Identity-owned records.
- While Render sleeps or no request occurs, database materialization may lag midnight; logical authorization still follows the calendar boundary. No claim of a physical database write at exactly00:00 while the process is asleep. After startup/next access the records reconcile. No polling/cron is added merely to keep Render awake. A request to close an owned prior-day session performs reconciliation, then returns409 `SESSION_DAY_ENDED` / "The work session day has ended"; it cannot add a late manual reason or rewrite the midnight timestamp.
- Compute actor/day and mutation time on the server. Recheck the day inside the transaction before a create/reopen/manual close; if the operation crosses midnight before its write guard, return409 `SESSION_DAY_ENDED` rather than opening the prior day. Already-admitted in-flight requests are not forcibly cancelled; no cross-service atomic authorization/commit promise.
- Use the existing unique(staffId,workDateVN), conditional transitions and Mongo transactions; bounded maximum3 application attempts for duplicate/write contention, then503 safe dependency/conflict failure. Concurrent opens must return one ID; concurrent closes create only one close event. Overlapping close/reopen requests may serialize in either order, but each response reflects its committed operation and there must never be two same-day sessions. No extra distributed lock or schema revision field.

## Evidence and exclusions

Guarded fresh loopback-only TASK-007 Mongo replica set with synthetic active accounts, keys and injected clock. Test create/open/reopen ID+openedAt preservation, close reason and atomic audit rollback/dedup, concurrent opens/closes, owner isolation/Manager nonoverride, input injection, auth denial, exact17:00UTC boundary, stale-session reconciliation after restart, no old-day authority, and DB failure. Retain relevant current-authority/auth regressions, build and smoke evidence. Do not mutate Atlas/real staff or claim hosted device/end-to-end acceptance.

History listing/audit ingestion and broad query scopes remain TASK-008; Manager account/recovery APIs TASK-009; UI/deployment/CI/CD remain later work. Overall readiness stays503. After implementation/tests, open draft PR for Tú review; user merges.

## Decision

Approve A together (state response/idempotent retry, required reason/local atomic audit, preserved openedAt, midnight timestamp/reconciliation and race semantics), or identify changes. Master Prompt Rule1 requires approval for these previously unspecified API/data semantics. This does not reopen TASK-006 approval or require private credentials.

Approval: Duy explicitly approved A (implement and test),23October2026. Proposal wording above retained as history.
