# POC-TU-01 — routing and English package bridge

Status: approved baseline mapped below; **new wire/binary details PROPOSED**.
Refs #70, next engine implementation #74. Tú owns engine/data; Hạo owns UI/storage.
Only docs and test fixtures are delivered here, no graph/route/deployed package.

## Approved versus missing

| Authority | Already approved | Missing before real release |
| --- | --- | --- |
| D009/DEC059 | SW shell; Cache Storage + IndexedDB; English package; immutable same-origin static assets conditional on free-host limits; checksums; candidate then atomic active pointer; 20% storage allowance | Measured complete artifact, app compatibility wire version, hosting/range/CORS proof, Safari/quota/reopen/update tests |
| D011/DEC071 | JS A* in Web Worker, OSM walking graph, thresholds below | Final binary/spatial index/profile/barrier/restriction handling, boundary/source artifact, entrance connectors, all-area coverage |
| D012/DEC072 | Messages, current request/version/target gate, terminate/recreate for synchronous cancellation, navigation snapshot pinned during update, withdrawal stops destination | Message exact types/limits, usable real engine/package, UI integration and end-to-end timings |
| Existing geography research docs | Arrival proposals, provenance/uncertainties; field work waived in TASK024 | Not an imported graph or a blanket field-verified connector. Public exterior arrival still needs walkable connection evidence |

No `research/` graph importer, CSR binary, boundary file or package exists in this
seed checkout. Historical harness counts/timings in baseline docs are references,
not reproduced tests or product acceptance. Obtain pinned data/provenance through
TU04's approved acquisition plan; do not download/build/deploy it in TU01.
Coverage remains current HCMC including merged regions/Con Dao. Disconnected island
components are legitimate NO_ROUTE, never joined across water to claim coverage.
The 3km nearby radius does not limit walking routes or graph coverage.

## Semantic Worker bridge — proposed exact types (R1)

No fourth service/routing provider. GPS is local in the browser, never Usage payload.
All lon/lat arrays are `[longitude,latitude]`, finite, within [-180,180]/[-90,90].
Request IDs are nonempty opaque strings, max128 characters, unique per calculation;
POI/revision IDs canonical lowercase ObjectId strings. Version strings nonempty
ASCII `[A-Za-z0-9._-]`, max100. Caller retains actual GPS, not a track history.

| Type | Required fields | Response |
| --- | --- | --- |
| LOAD_GRAPH | type, requestId, graphVersion, schemaVersion=1, verified local buffers/index metadata | GRAPH_READY with matching requestId/graphVersion/schemaVersion only after validation/load |
| CALCULATE_ROUTE | type, requestId, graphVersion, destinationPoiId, destinationRevisionId, position=[lon,lat], accuracyMeters, entrance=[lon,lat] | ROUTE_RESULT or ERROR |
| CANCEL | type, requestId | UI invalidates request and terminates/recreates synchronous worker; do not rely on queued message to interrupt A* |
| ROUTE_RESULT | type, requestId, graphVersion, destinationPoiId, destinationRevisionId, geometry, distanceMeters, instructions, snappedStart, snappedEnd, warnings | Accept only for current graph/request/POI/revision; a newer fix alone does not create parallel tasks |
| ERROR | type, requestId, code, retryable | GRAPH_UNAVAILABLE, GRAPH_INCOMPATIBLE, INVALID_POSITION, GPS_UNCERTAIN, SNAP_NOT_FOUND, NO_ROUTE, CALCULATION_FAILED |

geometry is an array of >=2 lon/lat points. distanceMeters is finite and >=0.
snappedStart/End are lon/lat points on verified allowed graph edges, never invented
straight-line connectors. Each instruction is `{maneuver,geometryIndex,distanceMeters,streetName,text}`:
maneuver `depart|continue|left|right|u_turn|arrive`, valid geometry index,
finite nonnegative distance to next step, nullable streetName, nonempty English text.
Warnings are fixed allowlisted codes proposed `UNVERIFIED_CONNECTOR`, `MISSING_STREET_NAME`;
UNVERIFIED_CONNECTOR must prevent unsafe turn-by-turn guidance, not authorize crossing
a wall/water. Unknown errors/properties are rejected, never shown as success.
Fixture shape acceptance does not prove a geometry follows roads or distance correctness.

Baseline thresholds, exact inclusive/exclusive interpretation used by fixtures:

| Gate | Rule |
| --- | --- |
| Valid routing fix | 0<=accuracyMeters<=50, otherwise GPS_UNCERTAIN |
| Snap | allowed edge within<=50m, connectivity/direction/connector still checked |
| Off route | >30m on 3 consecutive eligible fixes; bad/missing fix resets streak |
| Reroute | >=10000ms since last calculation, one inflight, newest eligible fix |
| Arrived | entrance distance<=25m and accuracy<=25m on a new valid fix; no autoplay |
| GPS unavailable | retain route/target/last position with unavailable state, no stale-fix arrival |

Result for a canceled request/different revision/graph/POI is ignored. On graph update,
keep old graph + destination snapshot until stop/arrival; next navigation uses new
package. A synced destination withdrawal overrides this and immediately stops it.
Load/snap/A*/instruction/message/render time belongs in the <=5s PRD measure;
fixture tests here are not a performance or GPS-device measure.

## Proposed binary/chunk bridge, not frozen research format (R2)

Candidate name `vinlook-csr-v1`, little-endian separate chunk files. Per chunk header
declares nodeCount/edgeCount and offsets/lengths; Uint32 offsets[nodeCount+1],
Uint32 edgeTargets[edgeCount], Float64 node longitude/latitude[nodeCount],
Float64 edgeLengthMeters[edgeCount], Uint32 streetNameIds[edgeCount]; terminal offset
equals edgeCount, offsets monotonic, targets in range, distances finite positive.
String table UTF-8 with bounded length prefixes; profile/permission/direction metadata
and cross-chunk stable OSM node IDs accompany arrays. Never merge by geometric
intersection or ignore bridge/tunnel/layer restrictions. Exact header byte layout,
cross-chunk edge ownership, permission enum and transfer/memory budget require Duy's
approval and actual TU04 importer evidence before decoding production data.

Propose max16MiB per distributed file/chunk; no total package/RAM/hosting claim.
Chunk bytes/count/offset arithmetic must be checked without overflow before allocation;
spatial index version/hash is bound to graphVersion. Unknown conditional access,
barrier, relations or inaccessible connectors are excluded with documented coverage
gaps, not silently treated as allowed. Full coverage must still pass release review.
A* uses a proven admissible distance heuristic for the chosen edge cost; compare
against independent Dijkstra in TU04, including disconnected cases. No algorithm
code is copied from absent research artifacts in this PR.

## Proposed package manifest (R3)

Metadata-only shape (all example identifiers in tests are **synthetic**):

```text
schemaVersion: 1
packageVersion, createdAt(UTC), language: "en"
appCompatibility: {minBuild: integer>=1, maxBuild: integer>=minBuild}
coverageVersion, boundaryFileId
graph: {graphVersion, schemaVersion:1, format:"vinlook-csr-v1",
        profileVersion, chunkFileIds:[...], spatialIndexFileId}
provenance: {kind:"osm"|"fixture", sourceSnapshot, license, attribution}
files: [{id, kind, url, byteLength, sha256}]
pois: [{id, revisionId, entrance:[lon,lat], englishText,
        thumbnailFileId, audioFileId}]
```

File kinds: shell, style, glyphs, sprite, pmtiles, boundary, graph, spatial-index,
poi, thumbnail, audio. Require at least one of every kind; shell inventory must
actually include all JS/CSS/English UI/fonts/icons/style dependencies; file hashes
alone cannot certify a complete shell. POI catalog and thumbnail/audio refs must
resolve with correct kinds; POIs must come from a fully published16locale snapshot,
even though the downloaded package includes English only. Snapshot revisionId and
entrance must match public Content data; no draft/staff/JWT/secret/provider keys.
Real media duration90–150s/provenance and publication checks belong in TU03/TU04;
matching a fixture manifest cannot certify those facts.

Each file id unique, byteLength positive safe integer, lowercase SHA256 hex64;
URL same-origin immutable `/offline/<packageVersion>/<safe-path>`, no queries,
fragments, credentials, path traversal, encoded traversal/separators or remote origin.
Verify declared bytes and hash before storing verified status. No binary graph/model
or downloaded third-party data in this source PR. Pin OSM snapshot URL/date/hash,
boundary artifact hash/version/provenance, profile/tool versions, ODbL attribution
and source obligations in the real release manifest; fixture provenance is never
accepted by a production importer. License strings here do not grant redistribution
of POI photos/audio; TU03 must verify their own rights.

Actual runtime decoder and manifest schema become shared only after Duy approval.
Unknown schemaVersion/app incompatibility => GRAPH_INCOMPATIBLE/package incomplete;
missing boundary/chunk/spatial index/media => incomplete, not a reduced ready package.
Numbers/file caps/format must be adjusted by reviewed evidence if infeasible.

## Activation, resume, updates and withdrawal (approved D009/012)

1. Download only on explicit user action; estimate candidateBytes*1.2 plus retained
   active storage, request persistence, still handle QuotaExceededError. No CDN/network
   dependency is allowed for a complete offline package; online route loading can
   fetch only needed verified graph data without downloading every audio first.
2. not_downloaded -> downloading -> verifying -> ready; failure => incomplete with
   safe reason/retry. Recheck already downloaded file hashes; retry missing/bad whole
   files only. Byte-range resume is not promised without measured host support.
3. Candidate is isolated from active. Cache Storage shell-ready marker is outside
   IndexedDB transaction; require matching version/marker before atomically replacing
   activePackageVersion. A crash before commit keeps old active; reopening validates
   marker/component presence and never labels evicted data ready.
4. Update errors keep old active. Clean old data only after new activation and reopen
   verification, never as preparation for a failing update. Current navigation keeps
   its pinned graph/snapshot as above; no mixed-version route.
5. Online sync uses actual `GET Content /api/v1/pois/deletions` response
   `{snapshotId,generatedAt,poiIds,complete:true}` inside normal envelope.
   Only a complete validated successful snapshot may hide listed cached POIs, stop
   their player/navigation and remove public presentation. Never clear all cache
   on a failed/partial sync; restore remains hidden until republished. Absence from
   a withdrawal set does not restore a cached POI without current public approval.
6. Mobile/laptop offline close+reopen, Safari eviction/quota, GPS/snap and real-route
   performance remain integration/device gates. No evidence is fabricated here.

## Handoff / decision

Test-only oracle: `packages/poc-routing/test/fixtures/poc-routing.mjs`, explicit
fixture mode, synthetic bytes, no engine or IDB implementation. It tests versioned
message acceptance, GPS gates and candidate verification/old-active preservation.
Use it only behind Hạo's development/test adapter; it cannot be a production route.

Run `node --test packages/poc-routing/test/poc-routing-contract.test.mjs`.
No cloud/provider, map/model acquisition, dependency addition, graph output or deploy.
Request Duy approve/amend **R1** message shapes/bounds, **R2** format/chunk direction
(header/profile details still gated), **R3** manifest/reference/compatibility details.
Option A: accept the proposed bridge for TU02/TU04+Hạo adapters with remaining real
data gates; option B: return specific edits. Do not call this approval or enable
production fallback while awaiting review.
