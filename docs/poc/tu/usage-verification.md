# TU02 Usage HTTP and Mongo implementation verification

Refs #71/#70; implementation PR93, dependency/lock proposal PR95. Prepared
26 October 2026 (UTC+7). Exact final heads, remote blobs and observed CI outcomes
are recorded in the GitHub handoff; this file never predicts a pending CI pass.

## Continuation and review basis

The first PR93 head `e8ffb75d81ae56b506f8956825a8ec0c4383ecc9` contained only the
independent lifecycle/counting and health libraries. At the next continuation,
#70 was closed and its human review/merge/acceptance checkboxes were all checked.
The issue event records Dihoccode1 closing it at 13:09:09 UTC on26October. We used
the merged U1–U4 document for the implementation candidate requested by Tú; this
does not invent an explicit A/B comment or authorize live environment changes.
Duy reviews the actual API/catalog/dependency code before integration/release.

Shared dependency handling is isolated in PR95:
`d5ce6fed3a3e0f94aa420a3090f0da846a669482` adds only mongoose9.11.3 to the Usage
manifest and workspace lock entry. That exact version/resolution was already used
by Content/Identity. No upgrade or new resolved package. It was merged locally into
the implementation branch for testing; Duy decides the shared integration order.
The package JSON merge conflict was resolved by retaining the core scripts and
adding only the declared dependency. Root lock has only the proposed Usage entry.

## Implemented paths

- Strict Usage-owned Mongoose schemas and Mongo validators for the two collections;
  exact unique/freshness indexes, no TTL/auto-create/index/buffering. Read-only
  catalog plan/fingerprint and startup verification reject mismatches. Test apply
  is restricted to a fresh loopback named replica set; production provisioning is
  a separate reviewed operation.
- Mongo transaction store with consistent bounded active snapshots, unique durable
  identity, atomic playback/presence writes, terminal recheck, snapshot/majority
  isolation and bounded per-process transaction queue. No application write retry
  or retained-record deletion. Capacity serialization is single-process; no hard
  distributed-capacity/p95 claim.
- All seven U1 route families: telemetry and fresh Staff/Manager monitor reads with
  no work-session requirement. Strict bodies/path IDs/locales, no queries, safe
  JSON envelopes,1KiB body,256KiB response, exact CORS/no cookies and versioned
  browser/global/account/in-flight limits. Public Content admission is fixed-route,
  bounded3s/8MiB, no JWT/redirect/retry, bound to exact POI/locale.
- Optional private business config/bootstrap requires Usage DB, writable replica
  set and exact existing catalog. Unconfigured scaffold stays live200/ready503.
  Configured runtime closes Mongo on startup/listen failure and shutdown; no live
  config/env was changed. Production TLS/host/origin validation is explicit.
- Health samples are on-demand memory only. Probes use service-owned readiness and
  Usage's own DB; missing global-jobs/worker bridge remains unknown with counts=null.
  No liveness shortcut, fake zero/up, cross-DB read or keepalive scheduler.

Code/operator port details and limitations are in
[services/usage/README.md](../../../services/usage/README.md).

## Executed local evidence

Pinned Node24.18.1/npm11.16.0, no system runtime changes. The local Docker client
exists but its daemon pipe was unavailable; **no local Mongo test was counted**.

| Check | Actual observation |
| --- | --- |
| Original core suites |25/25 PASS (17 lifecycle/counting,8 memory-health), none skipped |
| Original full module discovery after integration |101/101 PASS before the new HTTP/schema work |
| First HTTP suite |9/9 PASS; actual Usage/Identity/Content HTTP over temporary127.0.0.1 listeners; Usage store is a labelled memory transaction fixture |
| First schema/config/catalog units |3/3 PASS, disconnected model/config and read-only catalog model |
| First Usage non-DB combined run |37/37 PASS before the additional transport timeout/stream-cap regression |
| Actionlint1.7.12 |PASS for changed PoC backend workflow; optional shellcheck/pyflakes disabled |
| Final local workspace build |PASS across web/Identity/Content/Usage |
| Final runtime/authorization regression |20/20 PASS, controlled loopback |
| Final available module discovery |114/114 PASS, none skipped; includes38 Usage implementation tests plus existing fixture/routing/Content-tool suites |

Actual Mongo/CI results are recorded in the handoff after observation. The new
transport regression tests a real3s deadline even when an injected fetch ignores
abort, bounded streamed bytes and error redaction. These tests do not prove a real
TLS handshake or live caller-key/account acceptance.

The HTTP suites cover distinct browser/multitab/per-POI cardinality, server90s,
heartbeat/Pause semantics, terminal/duplicate/conflicting playback, all admission
failures,401/403/503, malformed/oversized/encoded/extra-field bodies, query/method/
route/CORS/preflight handling,60/600/12 windows and ten-in-flight rejection. Tests
use synthetic identities/public text/media and never a runtime fixture fallback.
The 600-event oracle, concurrent40 starts, rollback/lost-ack and stale worker cases
remain part of the independent core suite.

## New real-Mongo CI harness — results observed separately

`services/usage/scripts/test-mongo.mjs` creates a uniquely named container from the
same pinned Mongo digest as baseline CI,768MiB/one CPU, dynamic127.0.0.1 port and
explicit test label. It initializes vinlook_usage_poc, then passes only its name to
the test. The test verifies image/label/running/port/set/empty exact test DB before
catalog apply or record cleanup. It accepts no arbitrary URI; secrets/live env are
not inherited by the child. Finally only that created container is removed.

The suite exercises real validators/unique indexes/no TTL; same-ID starts across
two store instances; end during admission; a real transaction rollback on presence
failure; active snapshot overflow; full Usage HTTP backed by Mongo with fixture
Identity/Content; missing-index fail-closed behavior; the actual configured server
entrypoint/HTTP/readiness/graceful exit; and real disconnected DB503. Until its run
passes, code inspection/unit results are not claimed as database acceptance.

The PoC workflow now runs that suite as a separate required step before image
checks. Existing Identity/Content Mongo regressions remain separate evidence.
Actual image smoke without business env still tests the scaffold; the DB harness's
configured child tests the business startup path. No live hosted deployment implied.

## Reproduce and remaining acceptance

```text
npm run build --workspace=@vinlook/usage
npm run test:domain --workspace=@vinlook/usage
npm run test:http --workspace=@vinlook/usage
npm run test:db --workspace=@vinlook/usage
node --test tests/authorization.test.mjs tests/runtime-health.test.mjs
```

The DB command needs Docker and creates its own fixture. Never substitute Atlas
or a shared container. Production catalog apply/backup/restore/deploy needs an exact
separate Duy-approved plan. No live login, Atlas/provider/model/media/worker change,
real multidevice/load/cold-start/p95 or backup/restore acceptance performed. No
screenshot/video applies to the backend slice.

Remaining owner bridge: Content global job counts and worker status. The authorized
jobs route deliberately reports unknown/null/BRIDGE_PENDING, and the worker health
component unknown. Upstream readiness503 stays unavailable. These unfinished live
bridges and release acceptance prevent declaring the whole #71 complete. Duy reviews
PR95 then PR93; no automatic merge, shared live provisioning or issue closure.
