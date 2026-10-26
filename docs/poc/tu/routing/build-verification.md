# TU04 builder verification

Refs #74. Branch codex/poc-tu-04-build-artifacts starts from integration
a6958b45cb90a12570ed2ae9aa6599bacd5d895f. Source/data ownership only:
packages/poc-routing, scripts/poc/routing and docs/poc/tu/routing. No dependency,
root lock, Hạo/UI, service core, workflow, shared contract or environment changes.
Final head/remote blobs/actual CI are recorded after observation in GitHub handoff.

Executed with pinned Node24.18.1/npm11.16.0:

| Check | Actual observation |
| --- | --- |
| Importer/CSR tests |7/7 PASS before the additional independent Dijkstra assertion/component statistics |
| Manifest builder tests |4/4 PASS before strict nested public DTO checks |
| Real graph/manifest CLI tests + both suites |14/14 PASS; synthetic local bytes/OSM-shaped inputs only |
| Final expanded routing verification |43/43 PASS, none skipped; includes independent49-query round-trip oracle and final path/error guards |
| Available Usage/routing/Content-tool module discovery |128/128 PASS before the final focused path/error regression rerun |
| Content inventory/readiness reproducibility |PASS, repository-only, no live operation |

Actual exact-head CI results are recorded at handoff; pending checks are not inferred
successful here. The full routing command now includes
existing core/navigation/contract plus new importer/CSR/manifest/CLI suites.

Tests cover directed walking permissions, mode precedence, barriers, ambiguous
direction, relation quarantine/unresolved members, missing refs, duplicate and64-bit
IDs, deterministic output under reordered input, explicit budgets, bridges with
coincident coordinates, disconnected islands, and real encoded/decoded graph queries.
All49 node pairs in the round-trip fixture are checked against an independent
Dijkstra implementation; existing5760 core comparisons remain a separate suite.

Corruption tests recompute declared hashes where necessary to exercise structural
checks as well as checksum mismatch: malformed header/counts/offsets/targets/NaN
metric, metadata/version mismatch, truncation, index corruption and allocation
bounds. Manifest tests cover all39 synthetic files/15 English public-shaped DTOs,
hash/size/reference/type/URL/compatibility errors, stale publication binding,
duplicate audio, unknown private fields and capture-before-await behavior.

CLI tests run actual child processes with temporary input/output files. Graph
artifacts are decoded and hashes rechecked; existing output is preserved; Git output
and malformed/private inputs fail without echo. Manifest output explicitly says
assetsCopied=false/assetsPublished=false/releaseReady=false. Cleanup validates the
exact mkdtemp parent/prefix before removing only each test's own directory.

No real OSM extract/PBF decoder/boundary/map/media is read or downloaded. A complete
normalized extract is a required input declaration, not independently verified
full-city coverage. No license/right/human/publication/device/host/free-tier evidence
is fabricated. CSR/profile remain review candidates, not shared production wire;
no new Worker/UI consumer or ready package is activated. Non-UI screenshot/video N/A.

Command: `node scripts/poc/routing/verify-core.mjs`. Full available module discovery
is performed by the already merged PoC workflow; no CI config change is needed.
Keep #74 open for actual HCMC/merged-region/ConDao artifact, profile/header review,
15 real POI assets/arrivals, hosting and mobile/Safari/offline performance acceptance.
