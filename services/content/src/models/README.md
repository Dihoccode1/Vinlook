# Content-owned models

TASK-011 model factory requires an explicit service-owned Content connection. Import/compilation opens no connection or catalog writes. Strict schemas, no implicit version key, no Mixed/binary/provider payload or Identity imports/populate. Mongoose9.11.3 is pinned like Identity; numeric casts are disabled locally for coordinates/versions/duration, not globally for other services.

| Model/collection | Actual indexes beyond _id |
|---|---|
| POI / pois | deletedAt |
| POIRevision / poi_revisions | unique(poiId,revisionNumber); location2dsphere; poiId/status; unique(poiId) partial status in draft/in_review |
| LocalizedContent / localized_contents | unique(revisionId,languageCode) |

One partial index covers both working states. Separate per-status indexes would incorrectly allow one draft plus one in_review. Published rows remain outside that partial index; multiple published history rows still have distinct revision numbers. No TTL/deletion, implicit data migration or arbitrary extra geo/search index is supplied.

Document validation checks soft-deletion pairs, exact finite numeric GeoJSON Point, required source/versions/status, bounded strict HTTPS asset refs,16locale vocabulary, reviewer/time/audio/duration pairs and approved audio/textVersion/90–150second constraints. Draft source/name/location are required; draft entrance/thumbnail may be null. Published metadata additionally requires both. Pending/rejected output may retain stale/out-of-window audio, without becoming approved. Synthetic fixtures are not curated POIs, authoritative city boundaries, valid entrances, verified provider voices or actual media.

`safeContentError` only emits stable codes/known paths. Do not log/serialize original Mongoose/Mongo errors, which may contain rejected text, URLs or sensitive inputs. No generic write/query API is exposed here.

## Responsibilities of later APIs

Mongoose document validators do not protect arbitrary raw/query/bulk writes; the integration test deliberately proves that bypass on an isolated record. Later writers must validate the whole candidate state or equivalent conditional transactions. In particular: no editing persisted published revisions; exactly16current approved localized rows at publication; parent sourceVersion/English text/registry alignment; correct POI publication pointer; current staff authority/session; source/text edits invalidating affected approval/audio; owned immutable Cloudinary refs and actual bytes/duration; HCMC polygon/physical entrance verification and historical preservation. No schema/index alone proves these gates.

`npm run test:content` runs disconnected validations. `npm run test:content:db` only uses the fresh explicitly guarded TASK-011 replica set described in [evidence](../../../../../docs/planning/task011-implementation-evidence.md). It creates fixture catalog only after isolation checks; no Atlas connection or credential. Content HTTP startup remains unchanged and readiness503.

TASK-012 approved amendment: POI.mutationVersion is a noncoerced safe nonnegative integer default0, no extra index. Real API mutations conditionally increment the parent in their transaction; persisted missing/invalid counters require reviewed migration and are rejected by enabled runtime verification. No automatic backfill is performed.
