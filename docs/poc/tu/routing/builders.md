# TU04 local graph and manifest builders

Refs #74/#70. These are actual dependency-free importer/codec/build tools, not
fixed routes. They are a review candidate, **not a complete HCMC map/offline
release**. Duy reviews the profile/header/details before distribution. No source,
graph, map, boundary, media, browser GPS or hosted artifact was acquired here.

## Inputs and conservative profile

`importOsm(document, limits)` consumes normalized JSON:

```text
{complete:true,
 nodes:[{id,lon,lat,tags?}],
 ways:[{id,nodes:[nodeId,...],tags}],
 relations:[{id,members:[{type,ref,role},...],tags}]}
```

This is not a raw PBF decoder or direct Overpass response parser. A separately
reviewed upstream export must include relevant node/way/relation references;
`complete:true` is a caller declaration, not proof of full-city coverage. Missing
way nodes/restriction members, unsafe numeric IDs and duplicate IDs fail the build.
OSM64-bit IDs can be decimal strings; unsafe JavaScript numbers are never rounded.
Node IDs establish topology, not intersection/coincident coordinates or map layers.

Version `explicit-foot-review-v1` intentionally uses no unreviewed Vietnam default
access table. Explicit foot=yes/designated/permissive overrides general access;
when foot is absent, explicit general allowed access can admit a supported highway.
Unknown/destination/customer-only/conditional access is not a public walking grant.
Unresolved barriers are blocked; a supported barrier needs explicit foot permission,
and locked/ford/conditional cases remain blocked. Supported road/path classes are
an allowlist in source; motorway/trunk/areas/ferries/conveying/lifecycle conditions
are excluded rather than inferred safe.

Pedestrian direction uses oneway:foot and foot:forward/backward. Vehicle oneway on
ordinary roads does not impose pedestrian direction; an ambiguous oneway on a
pedestrian-type path is excluded. Every way is segmented at consecutive existing
OSM nodes, preserving intermediate geometry, endpoint geodesic lengths and IDs.
Zero-length segments are reported/skipped without merging coincident identities.

Turn-state restriction expansion is **not implemented**. Restriction/conditional
relations quarantine member ways and via nodes, even when except=foot could make
that overly conservative; unresolved/nested members abort. This loses connectivity
and must be reviewed before a real profile release. No restriction is silently
discarded as resolved. The report includes exclusion reasons, weak-component count,
largest weak component and isolated nodes; weak connectivity is not directed
reachability. Disconnected islands remain disconnected; no line/ferry is invented.

Primary tagging references consulted26October2026:

- [foot permission](https://wiki.openstreetmap.org/wiki/Key:foot) and
  [mode precedence](https://wiki.openstreetmap.org/wiki/Key:access).
- [pedestrian one-way](https://wiki.openstreetmap.org/wiki/Key:oneway:foot) and
  [directional foot tags](https://wiki.openstreetmap.org/wiki/Key:foot:forward).
- [pedestrian topology/barriers](https://wiki.openstreetmap.org/wiki/Guidelines_for_pedestrian_navigation)
  and [restriction relations](https://wiki.openstreetmap.org/wiki/Relation:restriction).

Those references explain the input tags; they do not certify field access or make
this deliberately incomplete profile a production router.

## CSR candidate and index

`encodeCsr` / `decodeCsr` use **vinlook-csr-review-v1**, not the still-proposed shared
vinlook-csr-v1 production wire. Do not rename the metadata to claim compatibility.
This decoder is not mounted in Hạo's Worker/UI. R2 header/cross-chunk ownership and
mobile budgets still need review. A candidate is one bounded file; oversized graphs
fail, never split into unreviewed cross-chunk topology or trim coverage.

Binary:64-byte header, little-endian. Bytes0–7 magic VLRCSR01; uint32 version at8,
nodeCount12, edgeCount16, zero flags20, exact byteLength24, zero reserved28;
metadata SHA256 bytes32–63. Then Float64 lon/lat pairs, one passability byte/node,
Uint32 offsets[n+1], Uint32 targets[e], Float64 costs[e], Uint32 name IDs[e].
DataView permits the explicitly computed unaligned fields. No integer multiplication
or allocation is accepted beyond declared counts/byte budgets; each file max16MiB.

The separate bounded UTF-8 JSON metadata contains graph/profile versions, unique
stable node/edge IDs and a name table. Binary hash is mandatory at decode; header
hash binds metadata. Magic/schema/flags/size/UTF-8/IDs/offsets/terminal offset/targets/
name IDs/passability/finite positive metric costs are validated. Inputs/config are
captured before async hashing so a later edit cannot switch the selected version.

The .001-degree grid sidecar contains cell-to-edge lists bound to graph SHA256 and
explicit entry/cell limits. `verifySpatialIndex` recomputes consistency; the existing
core still builds its own private query index. Serialized-index/Worker integration,
multi-chunk decoding and real memory/performance measures are not claimed.

## Offline manifest integrity

`buildManifest` derives lengths/hashes from caller-provided local bytes;
`verifyManifest` checks the proposed R3 metadata, same-origin immutable URLs, all11
component kinds, app/schema compatibility, references, budgets and hashes. Exactly
15 English public POI records are required. POI ID/revision/text/entrance must match;
audio hashes cannot be reused across those POIs. It rejects fixture provenance,
staff/unknown public fields, traversal/encoding/query/remote URLs and missing media.

This is a metadata/byte verifier. It does not prove supplied bytes came from the
declared public URL, that a supplied snapshot was fetched from Content, full16locale
publication at release time, OSM/boundary coverage, media codecs/licenses, shell
dependency closure or an approved graph header. It returns all those checks false
and releaseReady=false. R3's declared vinlook-csr-v1 string is not semantic decoding
of the separate CSR review format. These two commands are not a shortcut to a
production-compatible package; the release adapter must perform those missing gates.

## CLI and output discipline

Use pinned Node24.18.1. No network/login/env/provider command exists:

```text
node scripts/poc/routing/build.mjs graph --input LOCAL_OSM_JSON --limits LOCAL_LIMITS_JSON --out NEW_DIRECTORY
node scripts/poc/routing/build.mjs manifest --input LOCAL_PACKAGE_SPEC_JSON --limits LOCAL_LIMITS_JSON --out NEW_DIRECTORY
node scripts/poc/routing/verify-core.mjs
```

Graph input: `{source:{kind,snapshot,sha256,license,attribution},graphVersion,osm}`.
Real kind=osm requires HTTPS snapshot metadata and ODbL-1.0 attribution; the declared
source PBF bytes/hash are not read/verified. Report separately binds actual input
JSON SHA256. Synthetic kind=fixture requires explicit --fixture and stays labelled.

Budget JSON has inputBytes, importer{nodes,ways,relations,edges,tags,wayRefs,
relationMembers,totalRefs}, csr{nodes,edges,bytes,metadataBytes},
index{entries,cells}, runtime{nodes,edges,indexEntries,snapCandidates,queryEdges,
searchSettled}; manifest mode uses manifest{files,fileBytes,totalBytes}. All are
explicit positive integers; test budgets in source are not release capacity claims.
Input JSON max256MiB; individual candidate/manifest files max16MiB, no arbitrary
default full-city RAM budget. Full PBF/export/PMTiles feasibility still needs evidence.

Package spec: `{manifest: BASE_WITHOUT_FILES, files:[{id,kind,url,path}],
publishedPois:[15 public English DTOs], appBuild}`. Paths select explicit local
assets; UNC/network paths and hidden/key/env asset paths are refused. File bytes are checked twice; changed
content cannot silently keep an earlier hash. Manifest mode writes metadata only,
does not copy/upload/publish assets or make URLs available offline.

Output must be a new directory outside every Git checkout, including symlinked
parents; existing destinations are never overwritten. Graph files:graph.csr,
graph-meta.json,spatial-index.json,build-report.json. A .incomplete marker persists
on write failure and is removed only after all exclusive file writes/fsyncs. No
automatic deletion/retry/resume or filesystem/HTTP atomicity is promised. Successful
candidateFilesComplete means local files written, never release readiness.

No raw OSM/map/media/binary data is committed by this PR. Full HCMC including merged
regions/ConDao, reviewed arrivals/connectors,15 real POIs/media, hosting/Range/CORS,
actual Worker/instructions, Safari/device/offline/reopen and end-to-end5s gates
remain unfinished. See [build-verification.md](build-verification.md).
