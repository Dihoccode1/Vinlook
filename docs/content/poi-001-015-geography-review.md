# TASK-024 — Reviewed-semantics exterior arrival proposals

Prepared25October2026 UTC+7. Duy implements with AI assistance; **Tú reviews**. [Issue49](https://github.com/Dihoccode1/Vinlook/issues/49). Status: **15 concrete endpoint proposals, pending human review; not yet published/seeded**.

## Approved decision and scope

Duy approved **A: a public exterior pedestrian approach can be the navigation destination; reaching it does not promise access inside**. Field confirmation is waived, not recorded as actual observation. See [approved decision](../planning/task024-arrival-semantics-proposal.md). Existing `entrance` can hold the reviewed arrival reference; no new schema/API/provider or live opening-hours service is introduced. This decision supersedes the earlier strict visitor-gate interpretation in the PR50 research, not its source history.

Keep markers separate from arrival coordinates. Source model assumptions, access uncertainty and reviewer decisions must stay visible. OSM absence of a restriction is not proof of public ownership/current access. All numerical values below are desktop proposals; Tú must accept or request changes before final acceptance. No physical accuracy or legal-boundary survey is claimed.

## Marker candidates retained from PR50

Order is longitude,latitude. Vertex averages are display-marker proposals, not surveyed centroids or entrances. Pinned source object versions are in the links; live history may differ.

| POI | Destination | Marker candidate lon,lat | Pinned source | Boundary observation | Tú decision |
| --- | --- | --- | --- | --- | --- |
| POI-001 | Dinh Độc Lập | 106.6953365, 10.7769367 | [way/39598493 v42](https://www.openstreetmap.org/way/39598493/history) | OSM polygon inside | pending |
| POI-002 | Nhà thờ Đức Bà Sài Gòn | 106.6989505, 10.7798740 | [way/801950766 v18](https://www.openstreetmap.org/way/801950766/history) | OSM polygon inside | pending |
| POI-003 | Bưu điện Trung tâm Sài Gòn | 106.7000477, 10.7799384 | [way/39514793 v33](https://www.openstreetmap.org/way/39514793/history) | OSM polygon inside | pending |
| POI-004 | Nhà hát Thành phố | 106.7031414, 10.7766574 | [way/801710792 v14](https://www.openstreetmap.org/way/801710792/history) | OSM polygon inside | pending |
| POI-005 | Bến Nhà Rồng | 106.7067423, 10.7686128 | [way/808033616 v5](https://www.openstreetmap.org/way/808033616/history) | OSM polygon inside | pending |
| POI-006 | Bảo tàng Chứng tích Chiến tranh | 106.6922221, 10.7794375 | [way/186249226 v17](https://www.openstreetmap.org/way/186249226/history) | OSM polygon inside | pending |
| POI-007 | Bảo tàng Lịch sử TP.HCM | 106.7049367, 10.7879696 | [way/165567746 v19](https://www.openstreetmap.org/way/165567746/history) | OSM polygon inside | pending |
| POI-008 | Bảo tàng Mỹ thuật TP.HCM | 106.6992616, 10.7696223 | [way/802157425 v7](https://www.openstreetmap.org/way/802157425/history) | OSM polygon inside | pending |
| POI-009 | Landmark 81 | 106.7219067, 10.7947914 | [way/622296615 v15](https://www.openstreetmap.org/way/622296615/history) | OSM polygon inside | pending |
| POI-010 | Bitexco Financial Tower | 106.7043936, 10.7717652 | [way/804073951 v7](https://www.openstreetmap.org/way/804073951/history) | OSM polygon inside | pending |
| POI-011 | Thảo Cầm Viên Sài Gòn | 106.7067649, 10.7885373 | [way/32735038 v34](https://www.openstreetmap.org/way/32735038/history) | OSM polygon inside | pending |
| POI-012 | Phố đi bộ Nguyễn Huệ | 106.7038174, 10.7736957 | [way/341504312 v98](https://www.openstreetmap.org/way/341504312/history) | OSM polygon inside | pending |
| POI-013 | Phố Tây Bùi Viện | 106.6926885, 10.7668420 | [way/459271667 v56](https://www.openstreetmap.org/way/459271667/history) | OSM polygon inside | pending |
| POI-014 | Địa đạo Củ Chi — Bến Dược | 106.4638965, 11.1425695 | [way/973258391 v4](https://www.openstreetmap.org/way/973258391/history) | OSM polygon inside | pending |
| POI-015 | Chùa Bà Thiên Hậu — Chợ Lớn / Tuệ Thành | 106.6611561, 10.7534401 | [way/1497050780 v3](https://www.openstreetmap.org/way/1497050780/history) | OSM polygon inside | pending |

## Proposed exterior arrival coordinates

Selection combined POI identity, institutional gate/address context where available, road/footway type, absence of explicit access restrictions, position relative to mapped site outlines, and graph membership. Distance is only a ranking aid, not evidence of permission. No centroid was repurposed as an entrance. Vehicle-road centreline references are map-navigation references; they are not instructions to stand in traffic. Sidewalk/forecourt references are preferred where mapped. This is not wheelchair-accessibility certification.

| POI | Proposed arrival lon,lat | Interpretation | Acceptance |
| --- | --- | --- | --- |
| POI-001 | 106.6969924, 10.7757289 | Nguyen Du public street reference near operator-listed gate corridor | pending Tú review |
| POI-002 | 106.6986582, 10.7796304 | Public footway beside cathedral exterior | pending Tú review |
| POI-003 | 106.6997862, 10.7795569 | Public footway in post-office frontage area | pending Tú review |
| POI-004 | 106.7027044, 10.7762613 | Exterior forecourt approach beside Opera House | pending Tú review |
| POI-005 | 106.7059279, 10.7681049 | Public crossing/approach outside Nha Rong site | pending Tú review |
| POI-006 | 106.6926671, 10.7791297 | Exterior museum gate approach on Vo Van Tan side | pending Tú review |
| POI-007 | 106.7041462, 10.7880479 | Public approach opposite museum/zoo, away from internal zoo paths | pending Tú review |
| POI-008 | 106.6994909, 10.7700174 | Boundary approach to Fine Arts Museum main gate | pending Tú review |
| POI-009 | 106.7222692, 10.7948169 | Exterior sidewalk on east side of Landmark81 | pending Tú review |
| POI-010 | 106.7045926, 10.7716479 | Exterior footway beside Bitexco, no Skydeck-door promise | pending Tú review |
| POI-011 | 106.7055883, 10.7867994 | Public sidewalk outside southern zoo perimeter | pending Tú review |
| POI-012 | 106.7037473, 10.7738256 | Nguyen Hue sidewalk reference | pending Tú review |
| POI-013 | 106.6919240, 10.7664802 | Bui Vien sidewalk reference | pending Tú review |
| POI-014 | 106.4664005, 11.1411929 | Exterior road approach outside mapped Ben Duoc park outline | pending Tú review |
| POI-015 | 106.6614755, 10.7529634 | Public sidewalk beside Thien Hau/Cholon vicinity | pending Tú review |

### POI-001

- Endpoint: `106.6969924, 10.7757289`. Reason: Nguyen Du public street reference near operator-listed gate corridor.
- Provenance: [way/329878185 v34](https://www.openstreetmap.org/way/329878185/history), [node/11845234638 v1](https://www.openstreetmap.org/node/11845234638/history); node edit timestamp 2024-04-24 19:10:12+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "tertiary", "name": "Nguyễn Du"}`.
- Approximate straight distance to marker: 224.8m; not walking distance or gate distance.
- Limitation/review focus: Reference on road centreline, not exact135/106gate or a place to stand in traffic. Operator confirms Nguyen Du gate corridor; source does not certify this numerical point.
- Tú decision/date/comments: pending.

### POI-002

- Endpoint: `106.6986582, 10.7796304`. Reason: Public footway beside cathedral exterior.
- Provenance: [way/802069425 v3](https://www.openstreetmap.org/way/802069425/history), [node/7502330712 v2](https://www.openstreetmap.org/node/7502330712/history); node edit timestamp 2026-08-24 09:23:16+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "footway"}`.
- Approximate straight distance to marker: 41.8m; not walking distance or gate distance.
- Limitation/review focus: Restoration/entry status not guaranteed. No route into cathedral.
- Tú decision/date/comments: pending.

### POI-003

- Endpoint: `106.6997862, 10.7795569`. Reason: Public footway in post-office frontage area.
- Provenance: [way/801950746 v2](https://www.openstreetmap.org/way/801950746/history), [node/11537242394 v1](https://www.openstreetmap.org/node/11537242394/history); node edit timestamp 2024-01-21 16:31:43+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "footway"}`.
- Approximate straight distance to marker: 51.0m; not walking distance or gate distance.
- Limitation/review focus: Do not use cathedral doorway as post-office entrance; destination stays on exterior footway.
- Tú decision/date/comments: pending.

### POI-004

- Endpoint: `106.7027044, 10.7762613`. Reason: Exterior forecourt approach beside Opera House.
- Provenance: [way/1119254704 v3](https://www.openstreetmap.org/way/1119254704/history), [node/10236343229 v2](https://www.openstreetmap.org/node/10236343229/history); node edit timestamp 2023-04-14 23:17:38+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "footway"}`.
- Approximate straight distance to marker: 64.8m; not walking distance or gate distance.
- Limitation/review focus: Forecourt approach, not show admission or indoor access.
- Tú decision/date/comments: pending.

### POI-005

- Endpoint: `106.7059279, 10.7681049`. Reason: Public crossing/approach outside Nha Rong site.
- Provenance: [way/1536298183 v1](https://www.openstreetmap.org/way/1536298183/history), [node/13995919935 v1](https://www.openstreetmap.org/node/13995919935/history); node edit timestamp 2026-07-07 17:54:40+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "crossing", "highway": "footway"}`.
- Approximate straight distance to marker: 105.2m; not walking distance or gate distance.
- Limitation/review focus: Operator website still displays closure; no reopening confirmation found. End outside site, no instruction to enter works.
- Tú decision/date/comments: pending.

### POI-006

- Endpoint: `106.6926671, 10.7791297`. Reason: Exterior museum gate approach on Vo Van Tan side.
- Provenance: [way/1237558230 v1](https://www.openstreetmap.org/way/1237558230/history), [node/11494719176 v2](https://www.openstreetmap.org/node/11494719176/history); node edit timestamp 2024-04-09 00:58:46+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "service"}`.
- Approximate straight distance to marker: 59.3m; not walking distance or gate distance.
- Limitation/review focus: Source operator distinguishes Vo Van Tan visitor gate from Le Quy Don parking; chosen node is before gate, no entry promise.
- Tú decision/date/comments: pending.

### POI-007

- Endpoint: `106.7041462, 10.7880479`. Reason: Public approach opposite museum/zoo, away from internal zoo paths.
- Provenance: [way/193427293 v4](https://www.openstreetmap.org/way/193427293/history), [node/411918528 v4](https://www.openstreetmap.org/node/411918528/history); node edit timestamp 2024-04-25 08:14:34+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "service", "motorcar": "destination", "name": "Hẻm 25 Nguyễn Bỉnh Khiêm"}`.
- Approximate straight distance to marker: 86.6m; not walking distance or gate distance.
- Limitation/review focus: Point is on named Hem25 corridor across from museum frontage, not museum postal address or admission gate. Exterior to both museum footprint and zoo outline; no ticketed zoo shortcut assumed.
- Tú decision/date/comments: pending.

### POI-008

- Endpoint: `106.6994909, 10.7700174`. Reason: Boundary approach to Fine Arts Museum main gate.
- Provenance: [way/802157424 v4](https://www.openstreetmap.org/way/802157424/history), [node/13305622232 v2](https://www.openstreetmap.org/node/13305622232/history); node edit timestamp 2026-05-23 10:16:37+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "service"}`.
- Approximate straight distance to marker: 50.5m; not walking distance or gate distance.
- Limitation/review focus: Boundary main-entrance reference, not a claim of opening hours or entry permission.
- Tú decision/date/comments: pending.

### POI-009

- Endpoint: `106.7222692, 10.7948169`. Reason: Exterior sidewalk on east side of Landmark81.
- Provenance: [way/889445086 v5](https://www.openstreetmap.org/way/889445086/history), [node/8269074784 v1](https://www.openstreetmap.org/node/8269074784/history); node edit timestamp 2020-12-29 06:10:24+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "sidewalk", "highway": "footway"}`.
- Approximate straight distance to marker: 39.6m; not walking distance or gate distance.
- Limitation/review focus: Outside tower footprint; not residential/loading entry and not identification of Skyview ticket counter.
- Tú decision/date/comments: pending.

### POI-010

- Endpoint: `106.7045926, 10.7716479`. Reason: Exterior footway beside Bitexco, no Skydeck-door promise.
- Provenance: [way/804073930 v4](https://www.openstreetmap.org/way/804073930/history), [node/7520786480 v1](https://www.openstreetmap.org/node/7520786480/history); node edit timestamp 2020-05-15 04:31:18+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "footway"}`.
- Approximate straight distance to marker: 25.3m; not walking distance or gate distance.
- Limitation/review focus: Outside tower footprint; not asserted to be Skydeck ticket entrance.
- Tú decision/date/comments: pending.

### POI-011

- Endpoint: `106.7055883, 10.7867994`. Reason: Public sidewalk outside southern zoo perimeter.
- Provenance: [way/1544382384 v3](https://www.openstreetmap.org/way/1544382384/history), [node/14048099128 v2](https://www.openstreetmap.org/node/14048099128/history); node edit timestamp 2026-07-25 06:29:36+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "sidewalk", "highway": "footway"}`.
- Approximate straight distance to marker: 231.6m; not walking distance or gate distance.
- Limitation/review focus: Outside mapped zoo perimeter; nearby gate is tagged access=no and is not traversed or promised as an admission gate.
- Tú decision/date/comments: pending.

### POI-012

- Endpoint: `106.7037473, 10.7738256`. Reason: Nguyen Hue sidewalk reference.
- Provenance: [way/1550324378 v1](https://www.openstreetmap.org/way/1550324378/history), [node/3490015098 v6](https://www.openstreetmap.org/node/3490015098/history); node edit timestamp 2023-03-03 23:41:06+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "sidewalk", "highway": "footway"}`.
- Approximate straight distance to marker: 16.3m; not walking distance or gate distance.
- Limitation/review focus: Sidewalk rather than crossing midpoint; no all-day vehicle-ban claim.
- Tú decision/date/comments: pending.

### POI-013

- Endpoint: `106.6919240, 10.7664802`. Reason: Bui Vien sidewalk reference.
- Provenance: [way/1237832393 v1](https://www.openstreetmap.org/way/1237832393/history), [node/11497726264 v1](https://www.openstreetmap.org/node/11497726264/history); node edit timestamp 2024-01-07 18:06:38+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "sidewalk", "highway": "footway"}`.
- Approximate straight distance to marker: 92.5m; not walking distance or gate distance.
- Limitation/review focus: Sidewalk near pedestrian alley junction; no fixed pedestrian hours or performances guaranteed.
- Tú decision/date/comments: pending.

### POI-014

- Endpoint: `106.4664005, 11.1411929`. Reason: Exterior road approach outside mapped Ben Duoc park outline.
- Provenance: [way/564325161 v3](https://www.openstreetmap.org/way/564325161/history), [node/7717917936 v1](https://www.openstreetmap.org/node/7717917936/history); node edit timestamp 2020-07-15 22:23:04+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"highway": "tertiary"}`.
- Approximate straight distance to marker: 312.8m; not walking distance or gate distance.
- Limitation/review focus: OSM tertiary road reference outside park outline; not a tunnel mouth, ticket counter or Ben Dinh. Actual pedestrian access still a desktop inference for human review.
- Tú decision/date/comments: pending.

### POI-015

- Endpoint: `106.6614755, 10.7529634`. Reason: Public sidewalk beside Thien Hau/Cholon vicinity.
- Provenance: [way/1468659814 v6](https://www.openstreetmap.org/way/1468659814/history), [node/14028020211 v1](https://www.openstreetmap.org/node/14028020211/history); node edit timestamp 2026-07-20 04:07:56+00:00. Point is an existing member vertex, not an invented connector.
- Relevant way tags: `{"footway": "sidewalk", "highway": "footway"}`.
- Approximate straight distance to marker: 63.3m; not walking distance or gate distance.
- Limitation/review focus: Outside temple outline; not an assertion that a particular gate is open. No Thu Dau Mot temple substitution.
- Tú decision/date/comments: pending.

## Executed graph checks

Used the existing isolated routing research graph, not a new product build. Each endpoint exactly matches one graph vertex. Selected a nearby graph vertex by six rounds of graph-neighbour expansion, then ran A* and Dijkstra from it to the endpoint. All15had finite routes, valid predecessor/edge paths and matching costs. These starts are graph-generated test fixtures, not actual visitor GPS or a verified public starting location. The test checks local connectivity; it does not prove a route from every part of HCMC, current pedestrian permission or unobstructed field access. A* path edges can be fewer than six when a shorter route exists. No new snap threshold/configuration is added.

| POI | Fixture start lon,lat | Graph distance metres | Path edges | A*/Dijkstra/path validity |
| --- | --- | --- | --- | --- |
| POI-001 | 106.6973741, 10.7764435 | 117.10 | 6 | pass |
| POI-002 | 106.6979117, 10.7788379 | 123.83 | 6 | pass |
| POI-003 | 106.6995882, 10.7797641 | 44.05 | 6 | pass |
| POI-004 | 106.7025694, 10.7761187 | 21.65 | 6 | pass |
| POI-005 | 106.7057115, 10.7684448 | 49.60 | 6 | pass |
| POI-006 | 106.6939057, 10.7804917 | 203.13 | 6 | pass |
| POI-007 | 106.7031826, 10.7889408 | 144.69 | 6 | pass |
| POI-008 | 106.6991128, 10.7707699 | 99.28 | 6 | pass |
| POI-009 | 106.7220412, 10.7955961 | 112.94 | 6 | pass |
| POI-010 | 106.7044732, 10.7714108 | 30.00 | 6 | pass |
| POI-011 | 106.7079098, 10.7847097 | 344.60 | 6 | pass |
| POI-012 | 106.7033334, 10.7740291 | 63.65 | 6 | pass |
| POI-013 | 106.6932906, 10.7671097 | 167.06 | 6 | pass |
| POI-014 | 106.4628136, 11.1480031 | 1316.51 | 6 | pass |
| POI-015 | 106.6616185, 10.7529880 | 16.05 | 6 | pass |

Graph SHA256: `acde68201b8e417558172d88075acde36a3aacbae372aa38a56a394b4639a250`; 1120962vertices/2383764directed edges. Input/source/procedure in [attribution and verification](poi-001-015-geography-attribution.md). POI007 was moved outside zoo grounds; its replacement was rechecked and counted once among15unique endpoints.

## Visitor-copy handoff before publication

General meaning: "The route ends at an exterior approach point. Entry to the venue is subject to its current visitor rules."

POI005 specific handoff: "The museum website carries a renovation closure notice. Visitor reopening has not been confirmed in this research. The route ends outside the site."

These are editorial handoff notes, not shipped UI strings or published translations. They must be incorporated/reviewed with the appropriate English revision before visitor publication; text-version/audio invalidation and existing publication checks remain in force. Do not claim a currently open venue from these coordinates. No new runtime feature or live-hours integration is implied.

## Acceptance remaining

Tú reviews the15concrete coordinates, source identity and remaining assumptions. Field step remains waived. Human approval is not inferred from the earlier PR50 merge. Actual product route/GPS/offline/device/50-user acceptance remains separate. TASK024 geography can be accepted only after the reviewer resolves/accepts each point under approved A; no DB seed or visitor publication occurs in this task.
