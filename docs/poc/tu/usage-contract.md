# POC-TU-01 — Usage bridge for review

Status: **PROPOSED details, NOT an approved HTTP implementation**. Refs #70.
Seed: `f8058292169d994ae75116b078e3103cded34018`, integration branch
`codex/poc-demo`. Tú prepares; Duy approves shared decisions and merges.
No endpoint, database, dependency, environment or live data is changed here.

## Authority and implemented-versus-missing inventory

| Source | Reusable approved rule | Implementation at this seed |
| --- | --- | --- |
| D004/DEC054, D005/DEC055 | Usage owns BrowserPresence/ListeningSession; unique browserId/playbackId; no cross-DB reads | No Usage models/catalog/runtime yet |
| D006/DEC056 | Seven Usage route families below; API v1, error envelope, heartbeat/refresh 30s, expiry 90s | Usage app exposes only `/health/live` and `/health/ready` |
| D017/DEC077 | UUID telemetry identity, lifecycle/order/tombstone, server times, health freshness | No Usage business routes; reusable authorization adapter exists |
| `services/identity/src/auth/router.js`, `authorization.js`, `session-router.js` | `/api/v1/auth/login`, `/me`, work sessions, internal authorize | Implemented when configured. Login JWT is memory-only; `/me` returns account/currentWorkSession. Internal authorize uses a separate `usage` caller key, fresh account status, no positive authority cache |
| `services/content/src/drafts/router.js`, `public/router.js` | Content owns publication/POI validation | Public `/pois`, `/pois/:id`, `/pois/nearby`, `/pois/deletions`; admin draft/review/publication/jobs/media via subrouters. Do not infer every D006 outline route exists: e.g. no admin POI-list route at this seed |
| `services/usage/src/authorization.js` | `protectedRequest(...,{roles:['Staff','Manager'],requireSession:false})` | Adapter implemented/tested separately; not mounted by Usage app. Identity timeout 3s, JSON cap 16KiB, no redirect/retry; malformed/upstream failure becomes 503 |
| D017 section 6 | In-memory health samples, parallel 3s checks, freshness 30s; worker stale 180s | No monitoring jobs aggregate or safe worker-status source. Content admin jobs requires revisionId; cannot derive global job counts from it |

Traceability: REQ022–025, US027–030, UC030–032; D004/005/006/017.
Routing/offline consumers: REQ007–009, US007–009, D009/011/012.
This is source-code inspection, not fresh live verification of hosted services.

## Invariants already approved

- browserId: random UUID in visitor-only localStorage, shared across same-origin tabs.
  Two profiles/devices sharing an IP remain distinct. No GPS/IP/fingerprint telemetry.
  Coordinate first-write creation across tabs; storage-denied fallback is memory-only
  best effort, never blocks tourism. Hạo owns the real browser/storage race test.
- One audio per tab; independent tabs can listen to different POIs. New playbackId
  per new Play; Pause/Resume keep it. Count from Play, including Pause; end reasons
  are `completed`, `page_closed`, `closed`, `replaced`. No threshold of seconds heard.
- Server times determine freshness; end-before-start creates a terminal tombstone.
  Late start/heartbeat cannot revive it, and delayed end for A cannot terminate B.
- Global listeners = distinct browser IDs with an eligible open playback. Per-POI
  listeners = distinct browser IDs for each POI. Sum of rows can exceed global.
- No historical offline heartbeat queue. On reconnection send a fresh signal only
  for the browser/playback actually still active. Delivery on close is best effort.
- Monitor reads require active Staff/Manager, **no open work session**. Every request
  checks current authority through Identity. Visitor telemetry is not identity proof.
- Network/dependency failure preserves last known dashboard values/time and labels
  them stale/error; never substitutes an apparently fresh zero.

## Proposed HTTP wire bridge — decision U1

All paths below are relative to the Usage origin and prefixed `/api/v1`.
Requests have no query parameters; POST bodies are strict JSON objects with exactly
the listed fields. IDs: canonical lowercase UUIDv4 for browser/playback; canonical
lowercase ObjectId string for poiId; locale is an exact key of
`services/content/src/adapters/hybrid-v1.json` (16, no aliases). Do not accept
client timestamps, GPS, coordinates, IP, role, account/session ID, or device metadata.
`playbackId` in the path is not duplicated in the HTTP body.

| Method/path | Body / authority | HTTP 200 `data` |
| --- | --- | --- |
| POST `/presence/heartbeat` | `{browserId}`; visitor | `{acceptedAt}` |
| POST `/listening/start` | `{browserId,playbackId,poiId,languageCode}`; visitor | `{playbackId,acceptedAt,endedAt}` (endedAt=null normally; existing terminal tombstone time for late start) |
| POST `/listening/:playbackId/heartbeat` | `{browserId}`; visitor | `{playbackId,acceptedAt}`; unknown/ended ID gets 409, never creates a playback |
| POST `/listening/:playbackId/end` | `{browserId,reason}`; visitor | `{playbackId,endedAt}`; exact duplicate returns original endedAt |
| GET `/monitoring/summary` | No body; active Staff/Manager Bearer | `{asOf,refreshedAt,onlineVisitors,currentListeners,byPoi}` |
| GET `/monitoring/health` | No body; active Staff/Manager Bearer | `{asOf,components:[{name,status,checkedAt,lastSuccessAt,errorCode}]}` |
| GET `/monitoring/jobs` | No body; active Staff/Manager Bearer | `{asOf,checkedAt,lastSuccessAt,status,counts,errorCode}` |

Every success is `{data,requestId}`; every failure is
`{error:{code,message,requestId}}`. requestId is a server UUID. ISO-8601 UTC times
use millisecond precision. No browserId/playbackId list is returned by summary.
No cookies, persistent staff token, `Idempotency-Key`, or client `asOf` is added.

Summary example (synthetic; never a production fallback):

```json
{"data":{"asOf":"2026-10-26T00:00:30.000Z","refreshedAt":"2026-10-26T00:00:30.000Z","onlineVisitors":1,"currentListeners":1,"byPoi":[{"poiId":"000000000000000000000001","currentListeners":1},{"poiId":"000000000000000000000002","currentListeners":1}]},"requestId":"00000000-0000-4000-8000-000000000001"}
```

Counts are nonnegative safe integers. `byPoi` is complete for positive eligible
counts, sorted by poiId, no duplicate IDs, max 1000 rows; omit zero rows. Hạo joins
the public POI list for labels/zero rows; it must not interpret omitted rows as zero
after an unsuccessful/partial response. Presence does not contain poiId, so there
is **no invented per-POI onlineVisitors metric**. `refreshedAt` is Usage's completed
sample time, `asOf` is the one cutoff used for all counts. Do not expose retained
raw sessions or call current counts lifetime analytics.

Health component names proposed: `identity`, `content`, `usage`, `worker`;
status `up|unavailable|unknown|stale`, nullable times/errorCode. A component with no
verified sample is unknown, not up. A health request can succeed with unavailable
components; an authorization failure fails the whole request. Jobs status
`ok|unavailable|unknown|stale`; counts are `{queued,running,succeeded,failed,waiting_quota}`
only for a complete fresh authorized sample, otherwise **null**, never fabricated
zeros. Proposed safe codes `DEPENDENCY_UNAVAILABLE`, `SAMPLE_STALE`, `BRIDGE_PENDING`.
Do not treat existing readiness503 as healthy, or treat liveness200 as full readiness.
These shapes require Duy's approval and a Content-owned aggregate/status contract
before implementation; fixture data cannot supply missing live metrics.

## Admission, ordering and snapshot details — decision U2

The following concretizations are **proposed**, with independent fixtures only:

1. An entry is fresh iff `lastSeenAt > asOf - 90000ms`; exactly 90s is excluded.
   Do not wait for cleanup/TTL. Start and live listening heartbeat also refresh
   BrowserPresence using the same server time. End does not extend presence.
   Eligible listening requires both fresh browser presence and fresh, open playback.
   Compute global/byPoi at one cutoff and one consistent Usage snapshot.
2. First start verifies `GET Content /api/v1/pois/:id?language=...` with no JWT and
   no Content DB access: exact POI and locale, published current public payload,
   bounded JSON (8MiB current Content cap), 3s timeout, no redirects/retry. 404 means
   POI_NOT_AVAILABLE; network/invalid response means 503. No positive cache proposed
   initially. Fresh start is admitted at this check, not a distributed transaction
   with future publication/deletion. Immediate removal of ongoing counts after
   withdrawal needs a separate invalidation decision, not a claim of atomicity.
3. Server-generated timestamps only. Exact repeated start never changes startedAt
   or extends freshness. Same playbackId with different browser/POI/locale is 409.
   Do identity/replay/tombstone checks before a costly public-data check; terminal
   records remain terminal even if Content is unavailable. Recheck uniqueness and
   terminal state atomically at insertion, so concurrent end wins over late start.
4. Heartbeat updates only an existing open playback owned by browserId; it can
   refresh a timed-out but never-ended playback on a *new live* heartbeat. It cannot
   establish that a packet was freshly generated: client must discard offline
   queues. End-before-start stores browserId/playbackId and endedAt/reason without
   start-only POI/locale fields. Same-browser repeated end preserves first reason/time;
   cross-browser reuse is 409. End(A) cannot affect B in the same browser.
5. Pause is client playback state, not an endpoint/event; continue the 30s active
   heartbeat. Telemetry failure never prevents Play/Pause/close/navigation.

## Schema/index and capacity proposal — decision U3

Reuse two Usage-owned collections (proposed snake_case names below); no new shared
DB or service. Automatic collection/index creation off at runtime, explicit catalog
preflight, provisioning only after separate local-test/live gates.

| Collection | Fields and constraints | Declared indexes |
| --- | --- | --- |
| `browser_presences` | browserId UUIDv4 required; lastSeenAt Date required | unique `{browserId:1}`; `{lastSeenAt:1}` (D005) |
| `listening_sessions` | browserId/playbackId required; startedAt/poiId/languageCode required only for started records; lastSeenAt required; endedAt/endReason both null for open or both set for terminal. End-before-start has startedAt/poiId/languageCode null; endedAt/lastSeenAt server Date; started records keep start-only fields immutable | unique `{playbackId:1}`; `{browserId:1,endedAt:1,lastSeenAt:1}` (D005). Measure before proposing additional perPOI index |

Strict schema, no unknown fields/Mixed, safe integer counters only in response,
no IP/GPS/user agent storage. No TTL/automatic deletes. Preserve baseline 35+7-day
retention/backup constraints; terminal tombstones cannot be purged as a freshness
shortcut. Future cleanup/compaction must explicitly prevent old-ID resurrection.

**Proposed bounds, not measured capacity:** POST body 1024 bytes; reject unsupported
content encoding; public API fixed window 60 accepted attempts per browserId/minute,
600 telemetry attempts/service/minute and max 10 inflight requests, no queue.
Charge all attempted valid-browser operations including duplicates. Bound in-memory
browser rate buckets at 4096; refuse new buckets with 429, evict only expired windows.
Rate identity is caller-spoofable and resets on process restart: soft single-instance
abuse mitigation, not a security identity or a claim of distributed enforcement.
Apply the global cap/body cap before DB access; invalid IDs still consume global cap.
No IP-based identity, IP rate persistence, Redis, new Mongo rate collection or proxy
trust is introduced. Proposed dashboard limiter: 12 reads/minute per authenticated
account across monitoring routes (soft bounded memory); dashboard refreshes all
three every30s. GET has no body/query, response cap 256KiB. 1000 distinct active
browsers / 4000 active playbacks / 1000 byPoi entries are proposed admission/sample
bounds; on overflow return 503, never a truncated successful count. Historical
retention is separate from active bounds; no unapproved record deletion.
Duy must approve limits and admission/concurrency strategy before TU02 implementation;
these numbers do not prove the 50-visitor/p95 release AC.

## CORS, config and errors — decision U4

Proposed exact `USAGE_ALLOWED_ORIGINS` allowlist: HTTPS origins in production,
explicit loopback dev origins, never wildcard or reflected arbitrary origin.
`Vary: Origin`; allow methods GET/POST/OPTIONS and headers Content-Type/Authorization;
expose Retry-After. No credentials/cookies. Deny null/unlisted Origin with 403;
an absent Origin is allowed for CLI/service callers and is not proof of trust.
Preflight validates requested method/headers and returns204 without DB/auth mutation.
All business responses/errors no-store. No Origin/token/browser identity/raw URI/body
logging; counts are client-reported best effort, not verified unique humans.

Existing config: NODE_ENV/HOST/PORT, IDENTITY_BASE_URL,
USAGE_IDENTITY_SERVICE_KEY_B64URL. Proposed new consumed names:
`USAGE_MONGODB_URI` (exact vinlook_usage), `USAGE_ALLOWED_ORIGINS`,
`CONTENT_BASE_URL`. Constants/versioned limits above are not arbitrary runtime
overrides. Production HTTPS, no URL credentials/path/query/redirect, sanitized
startup failures naming fields only. No values/real secrets in documents/tests.
`IDENTITY_USAGE_SERVICE_KEY_B64URL` belongs to Identity; caller key stays server-side.

| HTTP / code | Fixed English message / use |
| --- | --- |
| 400 MALFORMED_JSON | Malformed JSON |
| 401 AUTHENTICATION_REQUIRED | Authentication is required |
| 403 ACCESS_DENIED | Access is denied (origin or active-account/role denial) |
| 404 POI_NOT_AVAILABLE | The public POI was not found |
| 404 ROUTE_NOT_FOUND | The route was not found |
| 405 METHOD_NOT_ALLOWED | The method is not allowed; Allow header lists route methods |
| 409 PLAYBACK_CONFLICT | The playback identity conflicts with the request |
| 409 PLAYBACK_NOT_OPEN | The playback is not open (unknown/ended heartbeat) |
| 413 PAYLOAD_TOO_LARGE | The request is too large |
| 415 UNSUPPORTED_MEDIA_TYPE | JSON content is required |
| 422 INVALID_INPUT | Invalid usage input (unknown field/query/ID/locale/reason) |
| 429 RATE_LIMITED | Too many usage requests; integer Retry-After seconds to window end |
| 503 AUTHORIZATION_UNAVAILABLE | Authorization is temporarily unavailable (reuse adapter) |
| 503 PUBLIC_CONTENT_UNAVAILABLE | Public content is temporarily unavailable |
| 503 USAGE_UNAVAILABLE | Usage data is temporarily unavailable (DB/capacity/sample failure) |

No work-session error on monitoring reads; no body is echoed in validation errors.
Unrecognized routes/methods use the safe 404/405 envelope above in TU02, not Express HTML.
These new code/message mappings are proposed; do not repurpose Content error codes.

## Fixture handoff and pending approval

`services/usage/test/fixtures/poc-usage.mjs` exposes test-only semantic methods:
`presence(browserId)`, `start(browserId,playbackId,poiId,languageCode)`,
`heartbeat(browserId,playbackId)`, `end(browserId,playbackId,reason)`, `summary(token)`.
It requires `{fixtureMode:true, now, publicPois}`; no default production activation.
`fixture-staff`/`fixture-manager` are synthetic tokens, not JWTs. Never import it
from a runtime app or use fixture counts as deployed evidence. Hạo can wrap these
methods behind one adapter; browser lifecycle/storage/beacon tests remain Hạo's.
The reference oracle is not a DB, HTTP/rate-limit/security implementation.

Run from repo root, no dependencies/cloud required:

```text
node --test services/usage/test/poc-usage-contract.test.mjs
node --test packages/poc-routing/test/poc-routing-contract.test.mjs
```

Duy decision requested in #70: approve/amend **U1** wire/summary/health/jobs shapes,
**U2** boundary/admission/order semantics, **U3** schema/bounds/limiting strategy,
**U4** config/CORS/errors; either approve the proposed bundle A or list per-group
changes (B). Until approved, no new endpoint/schema implementation in TU02.
Missing Content health/jobs aggregate and worker status need their owning lane's
approved bridge; no cross-DB workaround. Continue independent tests/research while
awaiting decisions; keep issue open for human review/merge/acceptance.
