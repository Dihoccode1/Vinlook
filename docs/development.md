# Running the TASK-002 scaffold

Use Node **24.18.1** and npm **11.16.0**. `.nvmrc`, `.node-version`, root engines and the preinstall check pin this runtime. This does not establish a Docker or hosted CI runtime yet.

From the repository root:

```sh
npm ci
npm run dev
npm run build
npm run check:scaffold
npm run test:runtime
```

Frontend dev runs at `http://127.0.0.1:5173`. Start each backend in a separate terminal:

```sh
npm start --workspace=@vinlook/identity
npm start --workspace=@vinlook/content
npm start --workspace=@vinlook/usage
```

Development defaults are localhost ports 3001, 3002 and 3003 respectively. Stop a terminal with Ctrl+C. TASK-003 validates NODE_ENV/HOST/PORT before listening and provides the minimal health routes below. Business and protected monitoring endpoints remain404. This is not a deployed production service.

## Runtime configuration and minimal health

Start/dev reads an optional `.env` in the service directory through Node's native env-file flag. Copy only the nonsecret settings from that service's `.env.example` if needed; shell/hosting values take precedence. Never put a real `.env` into Git or use a frontend env variable for backend credentials.

NODE_ENV permits development/test/production (default development). HOST defaults127.0.0.1 in dev/test. PORT defaults3001/3002/3003 in dev/test and must be an integer1–65535. Production requires explicit HOST=0.0.0.0 and PORT; do not infer production just from a hosting hostname. Invalid settings stop startup with field names and no values. The process config deliberately returns only these consumed nonsecret fields; database/auth/provider required config belongs to those actual implementation tasks.

GET `/health/live` returns200 `{data:{status:"up"},requestId}`. GET `/health/ready` deliberately returns503 `{error:{code:"DEPENDENCIES_UNVERIFIED",message:"Service dependencies are not verified",requestId}}` until actual owned dependencies are implemented and checked. Both return Cache-Control:no-store and a server-generated UUID, without echoing the caller's ID. A live process is not a ready product. Do not use these endpoints to keep Render awake.

Protected `/monitoring/health` and `/monitoring/jobs` remain404 until staff auth and the actual monitoring feature exist. No dependency polling, DB/provider details or cross-service DB credentials are exposed. D-017 freshness/timeouts remain contracts for later real dependency checks; no timer makes an unimplemented dependency healthy.

The scaffold smoke check starts all three apps concurrently on OS-assigned ports, verifies HTTP404 for unimplemented paths and no framework header, then closes them. The runtime suite checks defaults, missing/invalid production inputs, pre-listen startup failure, sentinel redaction and truthful health responses. Neither verifies authentication, database access, provider availability, network isolation, hosted lifecycle or signal delivery on Linux. Backend build checks ESM syntax; there is no transpilation.

## Structure

| Unit | Responsibility |
|---|---|
| apps/web | React19/Vite SPA, React Router Data Mode, Tailwind4 |
| services/identity | Identity and staff management boundary |
| services/content | POI, publication, content jobs and provider adapters boundary |
| services/usage | Anonymous usage and monitoring boundary |
| workers/mms | Reserved local Python worker boundary; no runtime implementation yet |

No shared database access, gateway, message broker or fourth hosted backend is introduced. Identity now connects to its explicitly configured owned database and verifies its collection/index catalog before serving registration/login. Content/Usage still have no database clients. Provider integration and frontend auth UI remain pending. shadcn component location and the `@` alias are reserved; no unused component dependency is installed. The initial page is an explicitly unavailable guide preview, not final approved UI acceptance.

Identity model checks: `npm run test:identity`. Real isolated Mongo index checks: `npm run test:identity:db` after creating the explicitly guarded disposable environment in [TASK-004 evidence](planning/task004-implementation-evidence.md). The integration suite refuses arbitrary URIs or an existing test database; no Atlas credential is needed. See [model boundaries](../services/identity/src/models/README.md) before adding write APIs.

Install versions are exact in workspace package files, and transitive versions/integrities are locked in package-lock.json. Use `npm ci` to reproduce them; don't copy node_modules. No product Python dependencies are installed by npm; the separate research virtualenv is excluded from publication.

Hosted runtime checks, Docker Compose, GitHub Actions, CI/CD, real dependency readiness, product features and full mobile/browser acceptance remain later tracked work. Passed scaffold/runtime checks are not MVP completion.

## TASK-005 Identity authentication

Identity startup additionally requires the secret variables and exact-origin settings in [the approved auth contract](planning/task005-auth-contract.md). Its example values are intentionally unusable. Use separate random keys per environment; keep them only in private backend configuration. A missing/mismatched database catalog stops startup before binding. Startup never creates, repairs or drops indexes; production provisioning/migration is still a separate deployment gate. Consequently a new empty Atlas database cannot yet boot this service by itself.

POST `/api/v1/auth/register` creates pending Staff; POST `/api/v1/auth/login` returns a two-hour memory-only client token for active accounts. Pending/locked/unknown/wrong credentials share a generic401. No Manager approval bypass, recovery, current-authority/RBAC endpoint or frontend storage is provided by this task. `/health/ready` remains503.

Run `npm run test:auth` for configuration/token/rate-helper tests. `npm run test:auth:db` requires a fresh, explicitly labelled/pinned, loopback-only TASK-005 Mongo replica set; see [test evidence and reproduction](planning/task005-implementation-evidence.md). It refuses arbitrary URIs, existing databases or Atlas. The suite alone creates collections/indexes and active fixtures inside this guarded environment.

Empty proxy trust ignores forwarding headers. Before any public proxy deployment, verify the actual proxy behavior/source CIDRs and configure an exact allowlist; otherwise requests may share a proxy IP budget. This implementation follows [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/), uses [official bcrypt](https://github.com/kelektiv/node.bcrypt.js) cost12 with a72-byte input ceiling, and [jose](https://github.com/panva/jose) HS256 verification. Local timing samples are not a hosted load/latency acceptance test.

## TASK-006 current authority

Identity startup now also requires distinct32-byte Content/Usage caller credentials (private env names in [approved contract](planning/task006-authorization-contract.md)). It validates them before opening Mongo or binding. Optional previous-key/absolute-expiry pairs support at most24hours overlap; expiration is checked on every request. Preserve the original deadline across deployments. Remove a compromised previous key and restart/redeploy to revoke it immediately; no automatic rotation service is implemented.

`GET /api/v1/me` verifies Bearer JWT and reads current account status/authVersion/role plus current Vietnam-day open session. `/api/v1/internal/authorize` requires the mapped service identity/key and strict token body; it rejects any Origin and cannot be accessed using a staff JWT alone. TASK-007 extends these checks to materialize logical closure of the verified account's prior-day sessions; they never open/reopen sessions or mutate accounts. Locked accounts fail403, obsolete versions fail401, DB uncertainty fails503. No role claim or cross-request positive cache is used.

Content and Usage independently own `src/authorization.js`. Initialize its private config only when wiring an actual protected route: each consumes its own caller key and exact Identity origin, no Identity database URI or signing key. The middleware requires fresh Identity results, applies server-declared roles/session requirements, and fails closed after a3000ms total request/body deadline. It never follows redirects, retries automatically or caches positive authority. Business routes are still absent; isolated test-only routes prove these gates, without adding public success/probe endpoints.

`npm run test:authorization` runs caller/config/rotation and local adapter HTTP failure tests. `npm run test:authorization:db` requires a fresh labelled/pinned TASK-006 replica set, described in [evidence](planning/task006-implementation-evidence.md). Neither needs real Atlas credentials. Existing TASK-005 child-process regression fixtures generate the two required synthetic caller keys. Readiness remains503; Manager changes/recovery, deployment and CI/CD remain later work.

## TASK-007 daily sessions

POST `/api/v1/work-sessions/open` accepts absent body or `{}`, deriving owner/day from verified current authority/server time. It creates one record/account/Vietnam day, returns the same open record on retry, and reopens the same-day closed record preserving ID and original openedAt. POST `/api/v1/work-sessions/:id/close` accepts only `{reason}` from the active owner, closes it and writes `work_session.close` into existing AuditLog in the same transaction. A retry while closed leaves time/reason unchanged. Manager cannot close another account's session. Historical reads/full audit ingestion remain TASK-008.

The logical session deadline is next00:00 Vietnam, regardless of host sleep. Before serving requests, Identity startup materializes prior-day open records as closed at their own midnight; authenticated principal/session access similarly reconciles the verified account. Physical DB updates may lag while Render sleeps. No cron/polling keeps it awake. Historical session manual-close requests return409 after reconciliation. Calendar day is rechecked before transactional mutation; bounded3attempt contention retry never replays an uncertain commit.

Run `npm run test:sessions:db` only with a fresh explicitly guarded TASK-007 replica set. See [approved contract](planning/task007-session-contract.md) and [actual evidence](planning/task007-implementation-evidence.md). No schema/index/env/dependency additions or Atlas provisioning are needed by this task. Startup now writes only the approved session reconciliation after verifying the existing catalog; index/collection creation remains disabled. Overall readiness stays503.

## TASK-008 audit receiver and history

POST `/api/v1/internal/audit-events` accepts only the mapped Content service credential, strict approved account/POI event payload and safe action/result registries. Worker, Usage and browser-origin requests are rejected. Identity supplies receivedAt and account actor type; Content cannot impersonate an operator or local account/session-management event. Delayed committed events retain the original actor/session/time even if the session is now closed or account locked. The receiver checks actor/session ownership, but trusts Content to preserve the previously verified business context. It does not prove the remote POI commit.

First insert201; exact normalized replay200 with original receipt; changed payload for the same eventId409. Unique eventId and bounded3 insertion attempts prevent duplicate concurrent writes without adding a hash field/collection. Events are append-only here, with no deletion/TTL or generic update endpoint.

GET `/api/v1/work-sessions` and `/api/v1/audit-logs` require fresh current authority. Staff scope is always their own account history; Manager can query account/operator history. No open work session is needed for reading. Strict scalar/date/ID filters, default20/max100 pagination, and requester/role/endpoint/filter-bound signed cursors prevent client-controlled scope changes. Cursor signing uses a domain-separated derived key from the existing private rate HMAC key. Key rotation invalidates cursors; list traversal is a live keyset view, not a frozen snapshot. Audit date filters use occurredAt over Vietnam days. Session queries reconcile stale records within their authorized scope before output.

`npm run test:audit:db` requires a fresh pinned/labelled loopback-only TASK-008 replica set; see [contract](planning/task008-audit-contract.md) and [actual evidence](planning/task008-implementation-evidence.md). Existing schema/index/secret/dependency definitions remain unchanged. Future Content tasks still need the actual transactional outbox and delivery loop; synthetic HTTP receiver tests are not cross-service end-to-end delivery. Owner Tú/reviewer Duy retained. Readiness remains503; UI, production deployment and CI/CD remain later work.

## TASK-009 Staff administration and recovery

Current active Manager can GET `/api/v1/staff` with status/limit/signed cursor and POST `/api/v1/staff/:id/approve|lock|unlock` with the expected previous status. Only Staff targets are eligible; Manager/self targeting through these APIs is404. No role change or account deletion. Listing hides hashes/versions and Manager records. These account operations do not require an open content work session; local audit uses workSessionId=null.

POST `/api/v1/staff/:id/recovery-codes` requires a verification reason and eligible active/locked Staff target. Manager must actually verify the requester before issuing/delivering a code. Code is32random bytes encoded canonical base64url, delivered once after commit; only SHA256 of decoded bytes is stored. It expires in15minutes, replaces previous unused codes without deleting history, and cannot be fetched again after a lost response. Reissue after verification if delivery was lost. Lock and issuance each increment authVersion, immediately invalidating old staff JWTs; unlock never restores those tokens. Issuance and reset serialize through the account version write.

POST `/api/v1/auth/reset-password` accepts email/code/password/confirmation. Bcrypt12, Unicode/byte/confirmation rules stay unchanged. Password update, one-use consumption, authVersion increment, expiry of other unused codes and local audit are one transaction. Expiry is checked again after hashing at consumption time. Reset does not unlock, log in or open a session. Operator-issued Manager-code consumption is supported, but actual operator issuance/bootstrap remains TASK-010; Manager API never issues codes for Manager targets.

Reset budgets are30requests/IP and5failed attempts/account per15minute UTC fixed window in Mongo. Invalid payloads count only against the IP budget; valid-input recovery failures consume account failure slots. Success does not clear earlier failures;429 includes Retry-After. Unknown/noneligible/wrong/expired/used/replaced/noncanonical codes share generic401. Proxy verification remains a production gate. No secrets/request bodies are logged or sent to frontend configuration.

Run `npm run test:staff:db` only on a fresh guarded TASK-009 replica set; [contract](planning/task009-staff-recovery-contract.md) and [evidence](planning/task009-implementation-evidence.md) describe reproduction. There is no real Manager provisioned by this test or task, no new schema/index/secret/dependency, and no paid email/SMS service. Overall readiness stays503. UI, operator tool and deployment/CI/CD remain separate work.

## TASK-010 local operator tool

`npm run operator --workspace=@vinlook/identity -- --help` makes no config/DB request. Local authenticated dry-run is the default; only --apply with exact target confirmation may mutate the scoped Identity DB. See [runbook](operations/manager-operator.md), [approved contract](planning/task010-operator-contract.md) and [actual evidence](planning/task010-implementation-evidence.md). Operator config is separate from HTTP/JWT/service credentials, with no public route or automatic Manager setup. Do not run real operations merely because the code is available; Duy must authorize operator/target and scoped credentials first.

Tests: `npm run test:operator` and `npm run test:operator:db` (fresh guarded TASK-010 Mongo only). Bootstrap guard is the immutable namespaced local audit event, recovery leaves status unchanged, unlock is separate. DB transaction operations are sequential within each session. Secret prompts fail closed for redirected input; simulated terminal tests do not establish human terminal acceptance. No hosted/paid change or schema/index/dependency added; readiness stays503.

## TASK-011 Content model foundation

Content now declares POI/POIRevision/LocalizedContent through an explicit connection factory, with Mongoose9.11.3 matching Identity. Model imports do not connect or create indexes; HTTP startup remains unchanged. The unique partial poiId index covers both draft/in_review, independent of published history. GeoJSON location and entrance remain distinct; raw coordinate strings are rejected without altering global number casts.

Run `npm run test:content` for disconnected document validation and `npm run test:content:db` only against a fresh guarded TASK-011 Mongo replica set. See [contract](planning/task011-content-schema-contract.md), [actual evidence](planning/task011-implementation-evidence.md) and [model boundaries](../services/content/src/models/README.md). Schemas/geo indexes do not prove HCMC membership, correct media/provider versions, exactly16current approvals, published immutability or API authorization; those gates belong to later actual writers/publication transactions. No real seed/media/Atlas change and no new HTTP feature-success route; readiness503.

## TASK-015 durability fixtures

Run `npm run test:durability` disconnected. Guarded `npm run test:durability:db` requires a fresh labelled/pinned TASK-015 loopback replica-set container; see [evidence](planning/task015-implementation-evidence.md) for exact setup/isolation/failures. No product startup DB connection or public mutation enabled; integrate the [internal primitives](../services/content/src/durability/README.md) only in separately approved endpoint tasks.
