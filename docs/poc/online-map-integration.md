# Online PoC map and directions

Duy approved27October2026: public GitHub Release for the HCMC R2 graph,
download/checksum during the existing Vercel build, same-origin static delivery,
and an online OpenStreetMap raster basemap with attribution. No paid plan,
tile bulk download or offline/prefetch feature is introduced.

The release pin is `data/poc/routing-release.json`. The56,629,135byte archive
contains5162graph tiles, manifest, boundary and completion metadata. Build
preparation checks the archive SHA256, restricts archive paths, verifies the
manifest and every tile's bytes/hash plus the boundary hash, then writes generated
assets under ignored `apps/web/public/routing/hcmc-20261027-v1/`.

`prepare-hosted.mjs` runs automatically on Vercel (`VERCEL=1`), or locally with
`VINLOOK_PREPARE_ROUTING=1`. An optional local archive path avoids downloading the
release again. Ordinary CI/local builds do not fetch assets. The Vite define
enables defaults only when the prepared marker and pinned manifest agree. All
three explicit VITE_ROUTING_* values can override this as a complete source.

The tourist detail card now mounts the existing NavigationPanel. Its destination
comes from the current published POI DTO, including revision and entrance. Starting
walk guidance requests foreground high-accuracy GPS through the existing policy,
calculates in the R2 Worker and draws the returned geometry on MapLibre. Stop,
target change, hidden page and unmount retain the current cancellation behavior.
Unconfigured graph or denied GPS shows an unavailable state, with no invented line.
Audio remains explicitly started by the visitor.

Raster tiles load through the browser's normal cache from the approved OSM URL.
Referrer-Policy is strict-origin-when-cross-origin. Attribution is visible above
map overlays; Graph/ODbL links to the published derived data and build provenance.
The service is best effort: https://operations.osmfoundation.org/policies/tiles/.

Quick verification: production web build passed with actual prepared assets;
7focused navigation/config checks passed. All15 proposed arrival references align
with eligible edges in the actual graph (see arrival-alignment JSON), which is
desktop geometry evidence, not fieldwork or a human access guarantee.

Release: https://github.com/Dihoccode1/Vinlook/releases/tag/poc-hcmc-r2-20261027-v1

Deployment handoff: Duy reviews/merges this PR. Use the reviewed merged commit for
the frontend deployment and keep existing Identity/Content/Usage origins, CORS and
free plans. No new secret is needed. Verify manifest200/hash, one tile200/hash,
basemap, GPS-denied handling and a route on a published POI. Publication is still
blocked until the existing16-language content/media review requirements are met.
The prior database read had1draft,3approved locale pairs and no public POI; this
UI/release change does not claim full PoC acceptance or populate that data.
