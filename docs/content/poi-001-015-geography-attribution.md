# TASK-024 — Geography provenance and attribution

Prepared25October2026 UTC+7. Duy implements; Tú reviews. Field confirmation waived by user; no observed field evidence. Candidate-coordinate tables are a small OSM-derived research extract, licensed under **Open Database License1.0 (ODbL)**. Credit: **© OpenStreetMap contributors; extract by Geofabrik**. Retain this attribution and license with reused data. [OSM copyright](https://www.openstreetmap.org/copyright); [ODbL1.0](https://opendatacommons.org/licenses/odbl/1-0/). This is not a license grant over third-party photographs or institutional prose.

## Pinned inputs and executed checks

- Source: https://download.geofabrik.de/asia/vietnam-261021.osm.pbf; previously downloaded for routing research, reused locally25October2026. No fresh live OSM API/Nominatim query or bulk download.
- File bytes: 331190223; actual SHA256 recalculated and matched: `02d76c03c14bb3248fd447ecfad1d085775a1ebcdd0538ff28d1214dbd3143f1`.
- Boundary input: existing research `inputs/hcm-boundary.geojson`, SHA256 `f6fcd202c9795335b84d5f7245011162100d817fb96e5b293fbc48d3a476face`. Provenance: OSM relation1973756 v289, timestamp 2026-10-02T03:48:17Z; [relation history](https://www.openstreetmap.org/relation/1973756/history).
- Pure ray-crossing containment with interior rings excluded: 15/15marker candidates inside pinned Polygon/MultiPolygon features. No legal-authority equivalence or freshness beyond source/version is certified; no production polygon implementation introduced.
- Selected OSM identities,15marker coordinates, object versions and node-to-outline membership checked locally. Original brute-force full index scan cancelled; filtered passes completed. A local IdFilter constructor mismatch was corrected before successful exact-member extraction. No failed run counted as success.
- All candidate values finite/in global longitude-latitude range; no selected candidate node explicitly tagged access=no/private. This check is not public-access proof. No GPS accuracy measured. No final entrance approved, no route/snap executed.

| POI | Marker provenance | Entrance/node alternatives provenance | Data license | Review |
| --- | --- | --- | --- | --- |
| POI-001 | way/39598493 v42; vertices-derived marker | node/2907851675 v7 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-002 | way/801950766 v18; vertices-derived marker | node/7501051348 v5 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-003 | way/39514793 v33; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-004 | way/801710792 v14; vertices-derived marker | node/7499846144 v3 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-005 | way/808033616 v5; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-006 | way/186249226 v17; vertices-derived marker | node/10723408129 v2, node/10723408130 v2 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-007 | way/165567746 v19; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-008 | way/802157425 v7; vertices-derived marker | node/13305622232 v2 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-009 | way/622296615 v15; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-010 | way/804073951 v7; vertices-derived marker | node/7520799150 v2, node/7520799149 v2, node/7520799151 v1 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-011 | way/32735038 v34; vertices-derived marker | node/5416327328 v6 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-012 | way/341504312 v98; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-013 | way/459271667 v56; vertices-derived marker | none selected | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-014 | way/973258391 v4; vertices-derived marker | node/5922616505 v2, node/5922616581 v2, node/5922616777 v2 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |
| POI-015 | way/1497050780 v3; vertices-derived marker | node/13711456041 v2, node/13711456042 v2, node/13711456040 v2 | OSM/Geofabrik pinned extract; ODbL1.0 | pending |

## Direct institutional page reads25October2026

- [Independence Palace map](https://dinhdoclap.gov.vn/en/independence-palace-map/): operator lists135Nam Ky Khoi Nghia and106Nguyen Du. Does not itself provide the chosen numeric outdoor gate coordinate; no Google-link coordinate copied.
- [War Remnants Museum ticket terms](https://ticket.baotangchungtichchientranh.vn/terms-and-conditions-en.html): operator distinguishes Vo Van Tan entrance from Le Quy Don parking. Supports semantic gate distinction, not numerical geolocation of the two OSM nodes.
- [History Museum introduction](https://www.baotanglichsutphcm.com.vn/gioi-thieu): read correct institutional identity; not a source of the candidate coordinate.
- [Zoo FAQ](https://www.saigonzoo.vn/p/cau-hoi-thuong-gap-hp16.html): operator page read; address is not verification of a ticket-node coordinate or current gate mapping.
- [Vinpearl Landmark81 visitor article](https://vinpearl.com/en/landmark-81-vietnam-discover-a-resort-paradise-in-the-clouds-in-saigon): read as visitor context; does not uniquely select outdoor door. Search variants give different ticket-counter floors, so no floor instruction adopted.
- [Cu Chi tentative-list submission](https://whc.unesco.org/en/tentativelists/7038/): page opened for site context. Tentative-list record is not a current entrance map, UNESCO inscription, operator confirmation or coordinate source; no numeric coordinate extracted from it here.

Other POI identity context comes from already merged editorial research, not a fresh institutional gate check this turn. Those sources must not be represented as numeric-coordinate provenance. No screenshot, Google map data, raw PBF, private GPS trace, user identity from OSM changesets or field image is published here.

## Handoff

This ledger preserves provenance for desktop candidates only. Final marker/entrance choices, uncertain external access and human review remain pending. Runtime schema/API/DB/seed and publication gates unchanged. No claim that15marker candidates amount to15usable navigation destinations.

## Follow-up: approved public exterior arrival semantics A

Duy approved exterior public arrival on25October2026; no promise of venue entry, field step waived. Candidate endpoint selection now has15concrete coordinates and source-node IDs. Earlier statements about unresolved strict visitor-entry gates describe PR50 history; actual visitor-gate opening still is not established. Final human acceptance remains pending.

| POI | Exterior approach way | Endpoint member node | Coordinate provenance/license |
| --- | --- | --- | --- |
| POI-001 | way/329878185 v34 | node/11845234638 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-002 | way/802069425 v3 | node/7502330712 v2 | OSM/Geofabrik, ODbL1.0 |
| POI-003 | way/801950746 v2 | node/11537242394 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-004 | way/1119254704 v3 | node/10236343229 v2 | OSM/Geofabrik, ODbL1.0 |
| POI-005 | way/1536298183 v1 | node/13995919935 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-006 | way/1237558230 v1 | node/11494719176 v2 | OSM/Geofabrik, ODbL1.0 |
| POI-007 | way/193427293 v4 | node/411918528 v4 | OSM/Geofabrik, ODbL1.0 |
| POI-008 | way/802157424 v4 | node/13305622232 v2 | OSM/Geofabrik, ODbL1.0 |
| POI-009 | way/889445086 v5 | node/8269074784 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-010 | way/804073930 v4 | node/7520786480 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-011 | way/1544382384 v3 | node/14048099128 v2 | OSM/Geofabrik, ODbL1.0 |
| POI-012 | way/1550324378 v1 | node/3490015098 v6 | OSM/Geofabrik, ODbL1.0 |
| POI-013 | way/1237832393 v1 | node/11497726264 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-014 | way/564325161 v3 | node/7717917936 v1 | OSM/Geofabrik, ODbL1.0 |
| POI-015 | way/1468659814 v6 | node/14028020211 v1 | OSM/Geofabrik, ODbL1.0 |

Additional direct sources read25October2026:

- [Palace visitor information](https://dinhdoclap.gov.vn/gio-tham-quan/): identifies Nguyen Du and Nam Ky Khoi Nghia gate corridors; not numerical evidence for an exact entrance point. The proposal uses a Nguyen Du map approach reference, explicitly distinguished from the gate.
- [Nha Rong operator renovation notice](https://bennharong.vn/thong-bao-dong-cua-trung-tu-bao-tang), dated6May2026: closure for works, reopening to be announced separately. [Operator announcements](https://bennharong.vn/thong-bao) displayed closed visiting-hours status on research read. No reopening confirmation found; do not infer permanent closure. Staff events do not establish visitor access.

## Executed follow-up and practical limits

Reused pinned hcm-highways-source.osm.pbf and Vietnam source. Filtered candidate ways by approved-profile-like foot/access/conditional constraints, then checked selected nodes in full pinned input for versions and tags. No selected node has a barrier or explicit no/private access; no chosen way has explicit no/private/permit/customers/destination access or conditional tags. Missing tags are not proof of legal access. Exact object membership and numeric coordinate ranges checked. Earlier brute-force approach search cancelled and rerun with bounding-box pruning; only successful final results counted. No additional data service/download.

Arrival-point exterior tests use the mapped POI footprint/site outlines rather than a cadastral boundary. POI007 was changed to a public corridor on the other side of the museum/zoo frontage; the internal museum-side path from the first pass is not the final endpoint. Streets are destinations rather than closed building polygons. Need human review of public-access interpretation; do not convert this evidence to a field survey.

Graph file hash matches existing build evidence. Engine: existing docs/research/routing-spike/engine.mjs.15unique endpoint checks passed with A*/Dijkstra agreement and valid local paths. POI007 replacement rerun retained instead of old result. Neighbour expansion starts are test fixtures, not sourced tourist GPS; these checks prove graph connectivity only. No real-world access, current site opening, legal-boundary equivalence or product navigation success certified. No automated straight connector through a wall is inserted: endpoint is an existing graph vertex. Paths use research profile and its documented limitations.

No application test rerun for documentation-only changes. Exact publication inventory is two updated geography Markdown files plus the approved arrival-semantics decision document; UTF8/null-byte/common credential-pattern/trailing-whitespace and15ID/range checks are run before publication. No secret, raw PBF, full graph, tiles, private photos, app code, schema/API, seed/Atlas or hosting changes.

Final follow-up checks:15/15arrival endpoints inside pinned HCMC polygon; POI007 is outside mapped zoo outline. Highways input SHA256 recalculated and matches graph build source: `990154364d9d6d892e49c17cfb5dd2d5ed76f308e442c5b5c62e207540c609da`. Existing engine SHA256: `2379b95530607319cd09cf32f6b12e673dca1daf5a33f17f1dfef7a089e1728a`. These are data consistency checks, not official/legal or physical-access certification.
