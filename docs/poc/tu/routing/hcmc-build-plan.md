# TU04 real HCMC graph and map — build plan for Duy approval

Refs #74. Nothing in this document has been downloaded, built or hosted yet. The scripts are
ready; each live step below needs Duy's explicit go-ahead.

## Pipeline

| Step | Command | Network | Output |
| --- | --- | --- | --- |
| 1. Review query | `node scripts/poc/routing/fetch-osm.mjs query` | none | Overpass QL printed |
| 2. Download | `node scripts/poc/routing/fetch-osm.mjs fetch --out <dir outside git>/hcmc.overpass.json --confirm-download` | one POST to overpass-api.de | raw JSON + `.provenance.json` (time, bytes, SHA-256, ODbL) |
| 3. Convert | `node scripts/poc/routing/fetch-osm.mjs convert --input <raw> --graph-version hcmc-<yyyymmdd>-v1 --out <dir>/hcmc.build-input.json` | none | importer document; fails on truncated extract or missing nodes |
| 4. Build graph | `node scripts/poc/routing/build.mjs graph --input <build-input> --limits <limits.json> --out <new dir outside git>` | none | `graph.csr`, `graph-meta.json`, `spatial-index.json`, `build-report.json` |
| 5. Map tiles | `pmtiles extract` of a Protomaps basemap build, clipped to the HCMC bbox | download | `hcmc.pmtiles` + style JSON (needs D3) |
| 6. Host + wire | upload artifacts, give #79 URLs, versions, hashes, sizes | upload | `createRouteWorkerClient({ csr })` in the app |

The query covers `ISO3166-2=VN-SG`, i.e. the current administrative city including the
2025 merged areas and Con Dao, with the highway classes the importer understands, their
nodes (with barrier tags) and touching `type=restriction` relations. Islands stay
disconnected; no ferry or straight-line joins are added.

## Decisions needed before a real build

**D1 — default foot access (blocking).** The current profile `explicit-foot-review-v1`
admits a way only when `foot`/`access` is explicitly `yes|designated|permissive`. Most HCMC
streets carry no such tag, so a real build would drop most of the network
(`FOOT_PERMISSION_NOT_EXPLICIT`). `convert` reports how many ways are explicitly tagged so the
gap can be measured. Proposal: a reviewed `vn-foot-v1` profile that treats an untagged
supported highway as walkable unless `foot|access` is `no|private`, keeps barriers/
restrictions conservative, and is labelled in the build report.

**D2 — artifact budget (blocking for full city).** `build.mjs` caps each file at 16 MiB and
the CSR metadata carries every node/edge ID as JSON. A city-wide walking graph is expected to
be far larger (order of millions of edges; to be measured from step 3, not assumed). Options:
(a) R2 chunked CSR by grid tile, loaded on demand around origin/destination;
(b) raise caps and drop per-node ID strings from metadata (index-based IDs);
(c) build per-district graphs covering the 15 POIs first, full city later.
(c) is fastest for the demo but does not meet the full-HCMC acceptance on its own.

**D3 — map tiles and hosting.** PMTiles needs HTTP Range and CORS from a free host. Options
to verify at decision time: the existing Vercel project's static files, an object store
with a free tier, or GitHub Releases (Range/CORS behaviour must be checked). No new paid
service. Attribution "© OpenStreetMap contributors" (ODbL) and the basemap's licence must
be shown on the map.

**D4 — Overpass use.** One large query against the public instance, run once, outside peak
hours, with no retry loop. If it times out (`remark` present → convert refuses), the
fallback is a Geofabrik Vietnam PBF, which needs a PBF decoder dependency (lock change → Duy).

**D5 — arrival points.** Each of the 15 TASK-024 arrival points must lie on an admitted edge
within `entranceToleranceMeters`; the build report must list any that do not, rather than
moving them silently.

## What is ready

- `fetch-osm.mjs` (query / guarded fetch / offline convert with checksum and provenance check).
- `build.mjs`, importer, CSR encoder/decoder, spatial index (#104).
- R1 Worker that loads the checksummed CSR and returns named instructions (#107, #109).

## Not done

No download, build, tile extract, upload, app wiring or device run. #74 stays open.
