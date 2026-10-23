# TASK-006 — Current authorization implementation contract

23 October 2026. Issue [12](https://github.com/Dihoccode1/Vinlook/issues/12). Owner Duy; reviewer Tú. TASK-005 merged at ce8e050449eaf784928d8c70ab79544a7ca62b04. This proposal fills concrete internal transport/config/error choices under Master Prompt Rule1; no TASK-006 code has been written.

## Existing approvals retained

D-003/D-007/D-017 require current Identity authority before each protected operation, no positive cross-request authority cache, fail closed on Identity failure, JWT signing key only at Identity, separate32-byte random caller credentials, at most24hours old/new credential overlap, and no internal worker authority to publish or directly access Identity. Existing two-hour JWT/config/password semantics remain unchanged. Requests already past authorization may finish after a lock; this task does not promise to cancel in-flight commits.

## Proposed A — HTTP and current principal

- `GET /api/v1/me`: Authorization Bearer JWT, no query/body inputs. Verify JWT with TASK-005 helper, read StaffAccount from Identity for every request, compare current authVersion and require active status. Return `{data:{account:{id,fullName,email,role,status},currentWorkSession},requestId}`. No token/hash/recovery credential returned.
- `POST /api/v1/internal/authorize`: backend callers only. Headers `X-Vinlook-Service: content|usage` and `X-Vinlook-Service-Key: <canonical base64url credential>`; strict JSON body `{accessToken}` only. Do not accept actorId, role, accountId or sessionId from caller. Authenticate caller before JSON parsing/user token work; then perform the same fresh Identity check. Return `{data:{account:{id,role,status,authVersion},currentWorkSession},requestId}`. Credential authentication alone never grants a staff identity or business permission. No worker mapping to this endpoint.
- Both contexts obtain a session by verified account ID + current Asia/Ho_Chi_Minh calendar date + status=open. Session object is `{id,workDateVN,status,openedAt,closedAt}` with UTC ISO timestamps, or null. Ignore old-day sessions even if stored open. Reading never creates, reopens or closes sessions; lifecycle remains TASK-007. `/me` works without an open session.
- Reusable role gate accepts only server-declared Staff/Manager requirements. Missing/invalid/expired JWT, missing account or stale authVersion:401 `AUTHENTICATION_REQUIRED` / "Authentication is required". Current pending/locked account or disallowed current role:403 `ACCESS_DENIED` / "Access is denied". A caller declaring a content mutation must require a current session or403 `WORK_SESSION_REQUIRED` / "An open work session is required". No token role is authority.
- Bad/missing service identity/key:401 `SERVICE_AUTHENTICATION_FAILED` / "Service authentication failed", without distinguishing caller existence/key state. Invalid JSON400, body over16KiB413, semantic/unknown inputs422. DB failure503 `DEPENDENCY_UNAVAILABLE`; safe messages, server UUID and Cache-Control:no-store, no raw errors/input/token logs.
- `/me` uses the existing exact frontend-origin allowlist, no credentials flag. Internal authorization rejects any Origin header, including the approved frontend origin: this endpoint is for backend clients and also requires the service credential. Origin absence alone is never authentication. No public diagnostic/probe route is added to prove a role gate; use test-only app fixtures.

## Proposed A — Private credentials and rotation

Identity additionally requires `IDENTITY_CONTENT_SERVICE_KEY_B64URL` and `IDENTITY_USAGE_SERVICE_KEY_B64URL`. Each is canonical base64url encoding of exactly32random bytes, distinct from each other and from JWT/rate keys. Never send these keys to the frontend, commit them or print config. Identity compares SHA256 digests with timingSafeEqual after strict input format validation. These credentials authorize only the mapped internal endpoint in this task, never audit/job routes that do not exist yet.

For each caller Identity may optionally accept `IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL` + `IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT`, or the corresponding USAGE pair. The pair must be complete; old key has the same encoding and must differ from all other configured keys. Expiry is canonical UTC ISO-8601. At startup, a future expiry must be no more than24hours away. An already-expired valid pair may remain configured but is never accepted; compare expiry on every request so a long-running process cannot extend overlap. Deployment must preserve the original absolute expiry across restarts, never reset it to now+24h. Immediate revocation means removing the previous key and restarting/redeploying; automatic key issuance/rotation is outside this task.

Content and Usage adapters respectively consume only `CONTENT_IDENTITY_SERVICE_KEY_B64URL` or `USAGE_IDENTITY_SERVICE_KEY_B64URL`, plus `IDENTITY_BASE_URL`. No JWT signing key, Identity Mongo URI or other caller key is consumed there. Base URL must be an exact HTTPS origin in production; development/test may use explicit loopback HTTP. Reject embedded credentials, query/hash and paths. No default guessed Render URL. No real credentials are needed for fixture tests.

## Proposed A — Downstream adapter behavior

Add small independently owned adapters in Content and Usage, not a fourth service or shared DB package. Protected middleware forwards the request Bearer token and its own service credential to Identity with a **3000ms total deadline**, no automatic retry/redirect or positive cache. Reject malformed/unexpected response schema and oversized response bodies (16KiB maximum) as dependency failure.401/403 safe authorization denial propagates without Identity internals; timeout/network/5xx/invalid protocol returns503 `AUTHORIZATION_UNAVAILABLE` / "Authorization is temporarily unavailable". Never continue a protected handler on uncertainty.

Each adapter applies its route's server-declared role/session requirements to the fresh response. There are no actual protected business endpoints in Content/Usage yet: test-only fixture routes demonstrate denial/admission, later tasks must explicitly wire these adapters into their real endpoints. Anonymous routes/offline use are unchanged. This task does not make overall readiness200 or claim deployment/CI/CD completion.

## Tests and boundaries

Use guarded fresh loopback-only TASK-006 Mongo fixtures and local HTTP. Test current active principal, malformed/expired/wrong-algorithm JWT, missing account, stale authVersion, lock/pending/current role changes between requests, unauthorized role, current-day/null/old-day sessions, injected identity fields, credential separation/missing/wrong/cross-caller/worker denial, old-key exact expiry and immediate removal, timeout/connection failure/malformed/oversized downstream response, forbidden redirect and repeated-call/no-cache behavior. Check both adapter units independently and retain existing regressions.

All account/status/version/session changes in these tests are synthetic fixture writes only. No production Manager/lock/reset/session API is invented here. Production provisioning, secret distribution, approved public proxy/deployment and full integration remain later gates. Tests and draft PR follow approval; Tú reviews and user merges.

## Decision requested

Approve A as a single contract (header/payload, private env/rotation names, status/error mapping, session context and3000ms adapter deadline) or identify changes. These details were absent from the approved high-level design; request is required by Master Prompt Rule1, not a request to approve TASK-005 again. No private keys should be supplied in chat.

Approval: Duy approved A (implement and test) on23October2026. Proposal wording above retained as history.
