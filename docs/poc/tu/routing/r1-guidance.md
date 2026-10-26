# TU04 R1 GPS/POI guidance Worker

Refs #74. Builds on PR #105 (`vinlook-node-worker-v1`); merge #105 first. Proposed R1
implementation for Duy review, not a frozen contract or real HCMC graph/map artifact.

## What it adds

- `packages/poc-routing/src/guidance.mjs`: pure `calculateGuidance(graph, {position,
  accuracyMeters, entrance, entranceToleranceMeters, maxResultPoints})` over the core
  `routeSnapped`, plus geometry-derived English instructions and the R1 error/warning
  allowlists.
- `route-worker-runtime.mjs` / `route-worker.mjs`: protocol `vinlook-route-worker-r1`
  with `LOAD_GRAPH` → `GRAPH_READY` and `CALCULATE_ROUTE` → `ROUTE_RESULT | ERROR
  {code, retryable}` exactly as in [routing-package-contract.md](../routing-package-contract.md) R1.
- `route-client.mjs`: `createRouteWorkerClient({graph, config, timeoutMilliseconds})`
  returns `{calculate({token, position, accuracyMeters, destination}), terminate()}`,
  the shape `apps/web/src/navigation/controller.js` already expects from
  `workerFactory()`. The result carries `requestId/graphVersion/poiId/revisionId/geometry`
  for `acceptRoute` plus `distanceMeters/instructions/snappedStart/snappedEnd/warnings`.
  `terminate()` physically stops the Worker and rejects in-flight work.

Integration for #79 (Duy): `workerFactory: () => createRouteWorkerClient({graph, config, timeoutMilliseconds})`
where `graph` is the verified normalized graph and `config` is
`{graphVersion, limits, maxRequests, maxResultPoints, entranceToleranceMeters}`.

## Connector and guidance rules (proposed, need Duy approval)

- Start: GPS is snapped to an allowed edge within 50 m (existing threshold). If the snap
  distance exceeds the reported accuracy, the result carries `UNVERIFIED_CONNECTOR` and
  only `depart`/`arrive` steps are emitted (no turn-by-turn), per R1.
- End: the approved arrival point must already lie on an allowed edge within
  `entranceToleranceMeters` (config, 0–25 m). Otherwise `SNAP_NOT_FOUND`; there is no
  straight-line join to an entrance.
- Maneuvers from bearing change at geometry vertices: <30° merged, 30–150° `left`/`right`,
  >150° `u_turn`. `streetName` is the OSM `name` of the edge leaving the step vertex
  (importer → CSR → Worker → instruction, e.g. "Turn left onto Lê Lợi"). `MISSING_STREET_NAME`
  is set only when a non-arrive step has no name.
- Retryable errors: `GPS_UNCERTAIN`, `SNAP_NOT_FOUND`, `CALCULATION_FAILED`.

## CSR loading

`createRouteWorkerClient` accepts either `graph` (normalized JSON) or `csr: {binary, metadata,
sha256, profileVersion, bytes, metadataBytes}` from the #104 build. The Worker verifies the
SHA-256, header/metadata binding and per-edge metric with `decodeCsr` before building the graph;
any failure is `GRAPH_UNAVAILABLE`. Messages are serialized so routing never sees a half-loaded graph.
The caller fetches the artifact bytes; hosting/manifest for the real HCMC artifact is still pending.

## Verification

`node --test packages/poc-routing/test/*.test.mjs`: 42/42 pass (38 existing + 4 new) on
Node 24.22.0 locally; `scripts/poc/routing/verify-worker.mjs` now includes the R1 files but
requires the pinned 24.18.1. New tests use a synthetic L/T topology and a real
`worker_threads` Worker: left/right/u-turn, unverified connector suppression, off-graph
entrance, far/uncertain GPS, disconnected target, controller/policy acceptance, version
mismatch and terminate during calculation. No browser, device, Safari or performance run.

## Not included

Real HCMC graph/PMTiles/style artifact and hosting, app mount, device/GPS/performance acceptance. #74 stays open.

Follow-up (street names + CSR loading): existing 56/56 routing tests pass after the change; no new
tests were added for it. A one-off local OSM → CSR → Worker run produced
"Head along Nguyễn Huệ / Turn left onto Lê Lợi / Arrive at the entrance" with no warnings.
