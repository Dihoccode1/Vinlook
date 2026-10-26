# TU04 core verification evidence

Refs #74. Branch codex/poc-tu-04-routing-package; baseline
`f8058292169d994ae75116b078e3103cded34018`. Clean status/remote inspected before
branch creation; D011/012, PoC ownership/traceability/review rules read. No AGENTS.md
or research/routing-spike source/data found in the clone. No parent repository used.

## Executed locally, 26 October 2026 UTC+7

Pinned Node24.18.1/npm11.16.0 already available outside the clone; system runtime
and root package/lock unchanged. Runtime modules use browser-compatible JavaScript
only; test/verification entrypoints use Node built-ins.

| Command/check | Result |
| --- | --- |
| `node scripts/poc/routing/verify-core.mjs` | Syntax checks and21/21 tests PASS, zero skipped; no cloud, DB or loopback |
| A* vs independent Dijkstra | 40deterministic directed graphs ×12source nodes ×12targets =5760queries; reachability and minimum costs agree within stated float tolerance; path edge sequence/weight independently checked |
| Graph semantics | No implicit geometric/bridge/tunnel joins; one-way/denied/unknown/unresolved/barrier rules, parallel edges, defensive copies, invalid metric/IDs, no-route and explicit budgets pass |
| Snap | 50m bounds/accuracy, same-edge forward/backward, shared endpoints, reachable non-nearest candidate, connector proof/failure and no straight fallback pass |
| GPS policy | Three valid fixes, exact cooldown, single inflight/latest fix, bad/stale/lost GPS, arrival/new timestamp, ID/version/cancel/withdrawal and resource/clock limits pass |

The first extended policy run was19/20: exact30m fixture accumulated as slightly
greater due coordinate floating-point arithmetic, prematurely suggesting reroute.
Implemented1e-7m geometric roundoff tolerance; kept the exact boundary assertions
and all product thresholds unchanged. Final suite adds shared-endpoint coverage
and passes21/21. No failure was relabelled a pass or fixture removed.

The5760queries are synthetic algorithm comparisons, **not**5760real routes, device
tests or product performance samples. Local test wall time is not the PRD<=5s
end-to-end navigation/RAM/Safari acceptance result. Coordinates near an arbitrary
HCMC-like reference are test geometry, not field data or verified streets/entrances.

## Publication/CI evidence

Exact commit/PR, staged scope/credential/whitespace scans, remote blob matches and
actual CI status belong in the GitHub handoff after publication. Do not predict CI
success here. Existing baseline Backend checks covers Identity/Content, not these
new routing suites; the new21test evidence above is local. Proposed PoC CI PR84
discovers package module tests only after its workflow is integrated by Duy.

## Not performed / remaining

No OSM/source/tile/model download, importer/profile/CSR real build, source-license
grant, map or graph artifact, production fixture, GPS/browser/Worker/UI/device test,
hard Worker termination, real connector/entrance verification, English package/app
shell/audio, hosting/Range/CORS, offline close/reopen/update, network load, deploy,
provider call or shared environment/database mutation. No screenshot/video applies
to this internal code slice; actual device/coverage evidence remains mandatory.

Internal normalized records and helper functions are not shared Worker/manifest
contract approval. No schema/migration/env name/dependency/new provider/service is
added. Hạo can inspect/test this core while TU01 wire details await Duy; no app file
is modified. Duy reviews/merges to codex/poc-demo; issue74 and original backlog stay
open until the respective real AC/acceptance, not merely this PR/test completion.
