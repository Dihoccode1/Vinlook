# Usage implementation status

Refs #71. `src/domain.js` and `src/health-sampler.js` implement the independent
D004/D005/D017 core. They are reusable libraries, not a fixture backend. Constructors
create no database connection, network request, polling timer or runtime route.
The existing app still exposes health scaffold only, with readiness503. No visitor
or monitor business endpoint is mounted by this slice.

`docs/poc/tu/usage-contract.md` remains PROPOSED. Duy reopened #70; no U1–U4 decision
was found at implementation start. HTTP wire/errors/CORS/rate limits, schema/catalog,
capacity strategy and new runtime config remain gated. A merge of the earlier
contract/fixture PR does not silently supply those decisions. Do not use these
modules as evidence that the Usage HTTP/database/live task is complete.

## Lifecycle and counting library

Create `createUsageService({store, verifyPublicPoi, languageCodes, now?})` explicitly.
The caller supplies the exact 16-code reviewed registry and an admission function
which returns true only for a verified public POI/locale; false means absent and a
failure/unknown result stops admission. There is no default synthetic public POI.
The implementation does not read Content's DB or borrow its dependencies.

Methods take strict input objects:

| Method | Internal input |
| --- | --- |
| presence | browserId |
| start | browserId, playbackId, poiId, languageCode |
| heartbeat | browserId, playbackId |
| end | browserId, playbackId, reason |
| summary | no visitor input; caller must enforce monitor authorization |

These are JavaScript library methods, not an approved HTTP schema. Times are safe
server epoch milliseconds internally; future approved wire adapters perform ISO
serialization and fixed HTTP error mapping. Browser/playback IDs are lowercase
UUIDv4; POI IDs lowercase ObjectId strings. No client clock/IP/GPS/role is accepted.
Visitor identifiers are self-reported and cannot establish identity or authority.

Start counts immediately. Duplicate start does not refresh timestamps or call
Content again. Conflicting browser/POI/locale reuse fails. End-before-start retains
a terminal minimal record; late start cannot fill it or resurrect listening. The
first end time/reason wins; end(A) cannot end a replacement playback(B). Heartbeat
refreshes only an existing open playback and its browser presence. Pause/Resume
retain the playback ID and use live heartbeats. No queue for historical heartbeats
or automatic deletion/retry/cleanup exists here.

Summary needs both fresh presence and an open fresh playback, with strict
lastSeenAt > asOf − 90000ms. Global/per-POI sets deduplicate browser IDs independently;
the per-POI sum can exceed global. Summary returns no browser/playback lists. Invalid,
inconsistent, duplicated or future-dated records and dependency failure produce a
fixed domain error, not truncated/partial counts or a fresh zero. These functions
do not replace fresh Staff/Manager authorization at the future HTTP boundary.

## Required durable storage port — not yet implemented

`store.transact(async tx => result)` must wait for a definite commit before resolving
and supply these operations inside one atomic transaction:

| Port method | Requirement |
| --- | --- |
| getPlayback(playbackId) | canonical private record or null; identity matches key |
| insertPlayback(record) | unique playback identity; no overwrite |
| replacePlayback(record) | replace the current conflicting playback atomically |
| touchPresence(record) | unique browser identity; preserve a monotonic maximum lastSeenAt |
| snapshot() | one consistent, complete Usage-only presence/playback sample |

Records at this internal port contain the approved logical fields; dates are epoch
numbers and model `_id` metadata is mapped by the future adapter. This is not a new
Mongo schema/catalog declaration. No Mongoose/driver import or cross-service model
reuse is introduced. Unknown store failures/commit acknowledgements produce a fixed
error. An explicitly repeated idempotent operation can reconcile retained state;
the core itself never retries a write.

The store must serialize conflicting playback/presence writes, including the
start-versus-end race. The core rechecks identity/terminal state after awaited public
admission, then writes playback/presence together. The future Mongo adapter needs
the approved unique indexes/transaction isolation, duplicate-key/write-conflict
handling and bounded complete snapshot/admission strategy; an async callback alone
does not provide those guarantees. Capacity/schema strategy remains U3 work. Until
that exists and passes disposable replica-set tests, no DB durability/concurrency
or production capacity is established.

`test/fixtures/transaction-store.mjs` is an explicit TEST ONLY serialized memory
model with rollback and lost-ack injection. It is never imported by runtime code.
Recreating the service against that same object tests logical retained state, not
a real process restart, Mongo persistence, index, transaction or deployment.

## Memory-only health sampling

`createHealthSampler({probes?, now?})` accepts explicit service-owned probes for
identity/content/usage/worker. Missing bridges remain unknown. Call `sample()` only
when a dashboard/release is active; no interval scheduler or keepalive is created.
Probes run in parallel, share one in-flight refresh, have a 3-second abort deadline
and cannot refresh more often than 30s. `snapshot()` ages existing observations
without making requests. A sample is stale at 30s; worker heartbeat evidence is
stale at 180s even when the probe response itself is fresh.

Service probes return true only after their approved readiness checks succeed;
liveness alone is insufficient. The worker probe must return exactly
`{healthy:true, observedAt}` with the actual safe server heartbeat time. There is
no default network probe or invented worker endpoint. Stalls/failures preserve the
lastSuccessAt and expose fixed codes. `close()` aborts pending probes and prevents
further sampling. A newly constructed sampler starts unknown. It supplies no job
counts; the missing Content-owned aggregate/status contract is still required.

## Testing and remaining work

With pinned Node24.18.1/npm11.16.0:

```text
npm run build --workspace=@vinlook/usage
npm run test:domain --workspace=@vinlook/usage
```

See [verification](../../docs/poc/tu/usage-verification.md) for executed evidence,
limitations and exact decisions still needed. No new env names, dependency, root
lock, schema/index provisioning or live environment changes are included.
