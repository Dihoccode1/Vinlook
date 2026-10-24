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
