# Real HCMC extraction and R2 tile build —27October2026 UTC+7

Duy owns this chain. Offline is excluded from PoC;15POIs/16locales and full current
HCMC online walking scope remain. This is a local data-build candidate, not release acceptance.

## Actual source and measurements

One approved Overpass request returned HTTP406 before data; no retry loop. Duy then
approved Geofabrik PBF + local Python processing. Source dated Vietnam261025 from
https://download.geofabrik.de/asia/vietnam.html,331590326bytes, SHA256 recorded in
`data/poc/hcmc-source-20261027.json`. Local MD5 matched the provider's dated sidecar.
Python3.12.14/osmium4.3.2/Shapely2.2.0 used only in an isolated build venv.

The country file contains46520592nodes,4755221ways,29642relations. VN-SG administrative
relation1973756 was assembled as a valid polygon with23833boundary points. Its bounds
105.9769387,8.3456879,108.4311207,11.5015885 include maritime territory; bbox-only clipping
would retain unrelated roads. Supported ways are selected by actual polygon intersection,
including full original way references where a way touches/crosses the boundary. Nodes retain
barrier/access tags; touching restrictions conservatively quarantine in-extract members.
176outside relation members are recorded as trimmed, not invented as graph connections.

| Measurement | Actual result |
| --- | ---: |
| Selected ways / referenced nodes |219012 /1144923|
| Normalized source JSON |102814796bytes|
| Ways with explicit positive foot/access |1378|
| Directed edges under approved vn-foot-v1 |2367566|
| Quarantined restriction ways / blocked nodes |2249 /794|
| Weak components / largest component nodes |32756 /721470|
| R2 tile count |5162|
| Total tile JSON bytes / maximum tile bytes |307550353 /753365|
| Manifest bytes |1718153|
| Tile hashes/lengths actually checked |5162/5162|

No geographic area was reduced to the15POIs. Disconnected components remain disconnected.
ODbL-1.0 and © OpenStreetMap contributors attribution apply. These measurements do not
prove every real entrance is reachable or every road is currently usable.

## Explicit policy and candidate structure

Duy explicitly approved: missing both foot/access on supported highway types uses
vn-foot-v1 default; explicit bans/private/unknown conditions/barriers remain conservative.
Motorway/trunk remain unsupported. Existing strict profile remains the API default;
new tile CLI requires `--profile vn-foot-v1`, so old callers do not change silently.

Candidate format `vinlook-tiled-r2-review-v1`:0.01degree grid, each node belongs to one tile,
every directed edge belongs to its source-node tile and carries target ID/coordinates.
Resident node rows carry global weak-component evidence. All cross-tile edges are retained,
no nearest-neighbor/straight-line connections are generated. Per-tile version/hash/size and
snap bounds bind the manifest. An incomplete build cannot emit its final complete marker.
Every report keeps coverageVerified=false/releaseReady=false.

## Reproduce (outside Git)

Download the dated PBF and provider checksum; save as `vietnam.osm.pbf` with the source
receipt copied from the public source JSON. Install `requirements-pbf.txt` in a private venv.
From the repository root, with ROOT pointing to that local directory outside Git:

```text
python scripts/poc/routing/extract-boundary.py --root ROOT
python scripts/poc/routing/extract-pbf.py --root ROOT --graph-version hcmc-20261027-v1
node --max-old-space-size=6144 scripts/poc/routing/build-tiles.mjs --input ROOT/hcmc-build-input.json --boundary ROOT/hcmc-boundary.geojson --out ROOT/new-r2-pack --profile vn-foot-v1
```

Bounds fail explicitly rather than trim:1.5Mnodes,300Kways,3.5Medges,16384tiles,
25000nodes/50000edges per tile,16MiB per tile/512MiB total output. They are desktop
build limits, not claimed mobile runtime budgets. No automatic network/hosting step.

Focused tests10/10 passed: old/new profile policy, bans/conditions, directed cross-tile
identity, deterministic components, missing targets and budgets plus existing importer/CSR
regression. Actual source extraction/build/hash verification is separate from fixture tests.

## Remaining required integration

Review/freeze R2 schema; implement bounded lazy tile loader/Worker search with cross-tile
correctness and instructions; verify15arrival snaps/connectors; select free immutable hosting
and CORS; provide actual basemap style/data; wire tourist map and route UI; measure mobile/
Safari/RAM/time/load and required coverage. Data pack is not in Git or uploaded by this PR.
Raw source/candidates are retained privately outside Git. No provider/POI/publish/deploy action.
