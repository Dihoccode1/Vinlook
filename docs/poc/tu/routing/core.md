# TU04 independent routing core

Refs #74. Pure JavaScript computation and tests, no package dependency. This is an
internal module slice, **not a completed HCMC navigation/offline package**. It
does not freeze TU01's pending Worker messages, binary CSR/header/profile, manifest
or shared UI contract. Tú implements; Duy reviews/merges into codex/poc-demo.

## Source and scope

D011/DEC071 approves JavaScript A* in a Worker and GPS/snap/reroute/arrival limits;
D012/DEC072 approves stale-result gating, cancellation/withdrawal behavior. There
is no research/routing-spike source, graph or boundary artifact in this seed
checkout. This slice is new code, not a claim of reusing or reproducing historical
harness results. It does not download OSM, maps, models, media or code from vendors.

Files:

- `packages/poc-routing/src/core.mjs`: validated directed graph, private storage,
  min-heap A*, geometry helpers, uniform-grid snap index and connected snap query.
- `packages/poc-routing/src/navigation.mjs`: pure foreground-navigation policy
  with one latest fix, target/route/request state and approved thresholds.
- Tests/fixtures under `packages/poc-routing/test`; synthetic topology only.
- `scripts/poc/routing/verify-core.mjs`: pinned-Node syntax/test reproduction command.

No app integration, HTTP/service, schema, dependency/lock, shared docs/workflow or
Hạo file is modified. Runtime source never imports test fixtures or sample routes.

## Internal normalized graph, not an OSM/CSR contract

`createGraph({nodes,edges}, limits)` consumes caller-prepared atomic segments:

```text
node: {id, point:[longitude,latitude], passable:true|false|null}
edge: {id, from:nodeId, to:nodeId, lengthMeters,
       walkable:true|false|null, restrictionsResolved:true|false|null}
limits: {nodes,edges,indexEntries,snapCandidates,queryEdges,searchSettled}
```

All limits are required positive integers chosen explicitly by the caller. Fixture
limits are not proposed HCMC/mobile release budgets. Exceeding any graph/index/
candidate/virtual-edge/search limit fails explicitly, never trims coverage or
returns a partial successful route. Graph storage is copied/private; caller edits
cannot alter topology/weights. No reverse edges are inferred. IDs establish
connections; intersections/coincident coordinates do not join bridge/tunnel layers.

Only edges with walkable=true, restrictionsResolved=true and both nodes explicitly
passable=true enter adjacency/index. Denied/unknown/barrier edges stay unusable.
This is **not** a real OSM foot/access/conditional/barrier/relations parser: a later
reviewed importer must derive those flags and encode turn-dependent restrictions
as allowed movement/state topology, not set true blindly. The core cannot certify
public access, levels, entrance connectors, source quality, licensing or a water
crossing just because an input claims permission. No profile is implicitly approved.

Distance costs must be positive finite and at least endpoint great-circle distance
(radius6371008.8m). This makes great-circle h(n) a lower bound/consistent heuristic
for node A*. Sub-geodesic or malformed lengths are rejected, not silently rounded
or repaired. Future importer metrics must match this invariant or a separately
reviewed cost/heuristic design. Straight atomic geometry is assumed; real way curves
must retain their geometry vertices through importer segmentation.

`aStar(graph,fromId,toId)` returns found path/cost/geometry or no_route without
geometry. The test oracle uses independent O(V²) Dijkstra, not the heap or heuristic.
No route query contacts a server or falls back to a line between disconnected nodes.

## Snap and connector boundary

Eligible directed segments are indexed in0.001-degree grid cells; bounding query
uses a50m radius and local latitude scale. Projection is local equirectangular;
reported offsets use great-circle distance. Antimeridian-spanning segments and
snap latitudes beyond±85° are explicitly unsupported by this internal index; these
are outside current HCMC/merged-region/ConDao scope, not a reduction of that scope.
Long/broad segments can exhaust the declared index budget and fail instead of
silently losing candidates. Real-data precision/performance still needs measurement.

`snapCandidates` returns candidates only, never a verified walking connector. No
global edge scan is performed per snap: it inspects grid buckets and deduplicates
their indexed segments. Candidate overflow fails rather than hiding a reachable
edge. It accepts accuracy<=50m; no snap outside50m is promoted to a distant road.

`routeSnapped(graph,{start,end,accuracyMeters,verifyConnector})` requires an explicit
connector verifier. The callback returns `{verified:true,lengthMeters}` only with
independent provenance/access proof; length must cover its geometric offset. The
fixture verifier is labelled synthetic and is not imported by runtime code.

Virtual source/target edges preserve fractional direction, including legal shared
endpoints; a same-edge backwards route needs an actual reverse path. Search chooses
reachable candidate pairs, not simply the closest disconnected edge. This virtual
query deliberately uses zero heuristic (A* with h=0), so unproven projection/
connector heuristic assumptions cannot invalidate shortest-path selection. Node
queries use the nonzero great-circle heuristic. Both use bounded heap search.

The result reports graphDistanceMeters plus totalDistanceMeters including supplied
verified connector costs; geometry is **on-graph only**, not a fabricated GPS-to-road
line. Actual connector geometry/instructions/arrival/UI need their reviewed adapter.
A one-point zero network path is valid internally, not an approved Worker result
shape. No-route returns no guidance; unverified connectors produce a failure.

## GPS/reroute policy

`createNavigationPolicy({maxRoutePoints,maxCalculations,now})` requires explicit
resource budgets and a monotonic clock (`performance.now` by default). Destination,
accepted route and latest fix stay in memory only; no GPS history/network/storage.

- Routing fix accuracy<=50m. Off-route means distance>30m for3consecutive eligible
  fixes; return to line, poor/missing GPS or stale timestamps reset the streak.
- Reroute admission requires>=10000ms since last calculation and no inflight task.
  While computing, only latest fix/streak state is kept; no parallel request starts.
- Arrival needs a **new accepted timestamp**, distance<=25m to the actual entrance
  and accuracy<=25m. No autoplay. Polling/callbacks cannot manufacture an arrival
  from an old fix. Monotonic timestamp checks do not prove sensor freshness; browser
  acquisition/foreground/error handling remains Hạo/Worker integration evidence.
- GPS loss preserves target/route/last good position and status. A late calculation
  completion does not pretend GPS has recovered; a new good fix is required.
- A route result must match current request/graph/POI/revision. Reused request IDs
  fail even across cancel/target changes; ID history is bounded by maxCalculations.
- Target change, cancel, arrival or synced withdrawal returns cancelRequestId. The
  caller must actually terminate/recreate a synchronous Worker under D012. A flag
  or stale-result check is not hard cancellation. AbortSignal tests only verify
  the core's abort checks; no real browser Worker cancellation is claimed here.

Coordinate arithmetic uses1e-7m tolerance at geometric comparisons so a computed
30.00000000003m does not falsely cross an exact30m boundary. It is sub-micrometre
roundoff handling, not a new GPS radius/hysteresis; accuracy/time limits remain exact.
Geometry/snapshot inputs/outputs are copied, invalid or over-budget data rejected.

## Reproduce and release gates

```text
node scripts/poc/routing/verify-core.mjs
```

Use repository-pinned Node24.18.1. No npm dependency installation/network/Docker is
needed for this slice. See [verification.md](verification.md) for observed results.
The existing backend workflow is triggered by scripts/** but does not run these
routing suites. PoC CI PR84 can discover them after Duy integrates that workflow;
do not report an absent check or unrelated regression as new-suite CI coverage.

Remaining TU04: real source/importer/foot profile/relations/topology verification,
full HCMC+merged regions+ConDao graph/map/entrance coverage and provenance/license,
binary/spatial-index/Worker/manifest integration after TU01 approval, instructions,
actual connector geometry, cancellation/package-update snapshot integration,
English15POI/media/app shell, storage/hosting/Range/CORS/reopen/update/deletion,
end-to-end<=5s/RAM/cold timing and real Safari/device tests. Android remains waived,
not tested. No full-scope/dataset/readiness claim; keep #74 open until Duy acceptance.
