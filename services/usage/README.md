# Usage service

Refs #71/#70, implementation PR93; dependency proposal PR95. The service now has
Mongo-backed telemetry and protected Monitor HTTP adapters. The unconfigured
process keeps the health scaffold (live200/ready503); business routes activate only
after explicit private config, replica-set connection and exact catalog preflight.
No automatic collection/index provisioning, production memory fallback, live
provisioning/deployment or fixture activation exists.

The earlier core-only snapshot is superseded by this implementation candidate.
At continuation, #70 was closed by Dihoccode1 with all review/merge/acceptance boxes
checked; the merged U1–U4 document supplies the wire implementation candidate.
Duy reviews the resulting code and the separate shared dependency/lock proposal
before merge/release. This does not authorize any live environment operation.

## Runtime and private configuration

Pinned Node24.18.1/npm11.16.0; Mongoose9.11.3 is the exact version already used by
Identity/Content, declared independently for Usage in PR95. No version upgrade.
Consumed names: existing NODE_ENV/HOST/PORT, IDENTITY_BASE_URL,
USAGE_IDENTITY_SERVICE_KEY_B64URL; business USAGE_MONGODB_URI,
USAGE_ALLOWED_ORIGINS and CONTENT_BASE_URL. Never print the private config object.
The Identity caller key stays server-side; visitor/public Content reads carry no JWT.

Mongo URI must select `vinlook_usage`; the isolated test mode permits only loopback
`vinlook_usage_poc_test`. Production Mongo requires TLS (SRV default or explicit
tls=true). No TLS bypass options, cross-DB name, unsupported URI options or arbitrary
HTTP origins are accepted. Public origins are canonical HTTPS; explicit loopback
HTTP origins are permitted only outside production. Allowed frontend origins are
exact, never wildcard. Startup errors name fields only or use a fixed message.

`connectUsageRuntime` requires a writable replica set and an exact existing
catalog. It never repairs indexes/validators or drops retained rows. Readiness200
means this configured Usage catalog/DB passed its checks; monitor component health
is separate. Background probes are not started. Shutdown closes HTTP and Mongo.

## Telemetry and Monitor API

Paths are prefixed `/api/v1`, no query parameters. Strict JSON bodies, server times
and `{data,requestId}` / `{error:{code,message,requestId}}`, no-store responses.

| Method/path | Input / permission |
| --- | --- |
| POST /presence/heartbeat | `{browserId}`; visitor |
| POST /listening/start | `{browserId,playbackId,poiId,languageCode}`; visitor |
| POST /listening/:playbackId/heartbeat | `{browserId}`; visitor |
| POST /listening/:playbackId/end | `{browserId,reason}`; visitor |
| GET /monitoring/summary | fresh active Staff/Manager Bearer; no open session needed |
| GET /monitoring/health | same permission; on-demand component samples |
| GET /monitoring/jobs | same permission; unknown/null until Content aggregate bridge exists |

browserId/playbackId are lowercase UUIDv4; poiId is lowercase ObjectId; locale is one
of the exact 16 hybrid-v1 codes. The standalone Usage vocabulary is checked against
Content's registry in tests; production does not read Content's files or database.
No IP/GPS/user-agent/client time/account fields are stored. Visitor UUIDs are
self-reported and cannot establish identity or prove unique humans.

Fresh start verifies the exact existing public Content detail/locale before writing:
HTTPS/configured origin, fixed GET, 3s whole-request bound, decompressed JSON cap8MiB,
no credentials/cookies/redirect/retry. A wrong POI/locale/malformed payload fails
closed;404 becomes POI_NOT_AVAILABLE. Existing duplicate/terminal identities are
checked before that call. Publication may change afterwards: this is not an atomic
transaction across services and does not implement withdrawal invalidation.

Start counts immediately; duplicate start preserves original freshness/time. Pause
keeps the playback ID and uses live heartbeats. End-before-start stays terminal;
the first end reason/time wins and end(A) cannot end replacement(B). Start rechecks
after awaited admission, then writes playback/presence in one Mongo transaction.
Heartbeat refreshes only an existing open playback. No application write retry,
history heartbeat queue, TTL or retention deletion is implemented.

Summary uses a complete bounded snapshot and strict lastSeenAt > asOf−90000ms,
requiring fresh presence plus open fresh playback. Distinct browser sets are counted
globally and per POI; row sums may exceed global. No raw browser/playback list is
returned. Overflow, DB failure or corrupt state returns503, never a partial count
or an apparently fresh zero. Dashboard clients retain/label their prior sample on
failure; server failure does not certify its old counts as fresh.

## Limits and deployment scope

JSON body1024bytes; unsupported encoding rejected. Public attempts:600/minute per
process and60/minute per valid browser ID, including duplicates. Monitor reads:
12/minute per freshly authorized account. Inflight10, no HTTP waiting queue;
in-memory rate maps max4096 buckets, expired-window eviction only.429 has numeric
Retry-After. Limits are soft single-process mitigation, reset on restart and are
not IP identity or distributed abuse enforcement. CORS preflight validates exact
origin/method/headers without DB/auth mutation; cookies are never enabled.

Snapshot/admission bounds:1000 active browsers,4000 active playbacks,1000 positive
POI rows,256KiB response. Mongo operations use snapshot/majority transactions,
unique IDs and a bounded per-process transaction queue. Snapshot/capacity checks
fail on overflow. Capacity serialization is per process; hard distributed capacity,
multi-instance load,50-visitor/p95 and cold starts are not established. Do not infer
those guarantees from the concurrency identity tests.

## Catalog and retained data

Two Usage-owned collections: browser_presences and listening_sessions. Validators
reject unknown fields and illegal start/terminal combinations; unique browserId/
playbackId and the D005 freshness indexes are exact. Runtime autoCreate/autoIndex
and buffering are off. `planUsageCatalog` is read-only and produces a public schema
fingerprint/mismatch summary. `applyUsageTestCatalog` is restricted to a fresh
loopback `vinlook_usage_poc_test` replica set named vinlook_usage_poc; it creates
only the expected collections/indexes, never repairs or deletes data.

Production catalog provisioning and rollback need a separate exact approved plan.
Keep terminal records under the existing retention/backup rules; no automatic TTL
or cleanup permits an old ID to resurrect. The test harness alone deletes records
and removes its own disposable labelled container.

## Health and remaining bridges

On-demand memory probes run in parallel with3s abort, shared in-flight refresh and
30s cadence/freshness. Worker evidence would stale at180s. Real probes query
Identity/Content `/health/ready` and Usage's own DB; liveness200 is not substituted.
Missing worker status and Content global-jobs contracts remain unknown/BRIDGE_PENDING,
with job counts=null. No invented endpoint, cross-DB read, fabricated up/zero or
keepalive scheduler is added. Cold-start/failure preserves lastSuccessAt and safe
errors. Current upstream readiness503 remains unavailable even if auth/data work.

## Test commands

```text
npm run build --workspace=@vinlook/usage
npm run test:domain --workspace=@vinlook/usage
npm run test:http --workspace=@vinlook/usage
npm run test:db --workspace=@vinlook/usage
```

The DB command requires Docker. It never accepts a URI: it creates one fresh pinned
Mongo container, validates image/label/loopback port/set/empty test DB, runs real
transaction/catalog/business HTTP/entrypoint tests, then removes only that container.
CI runs the same harness. Fixture Identity/Content/public media are synthetic and
test-only. See [verification](../../docs/poc/tu/usage-verification.md) for actual
results, exact heads and the difference between local, CI and live evidence.
