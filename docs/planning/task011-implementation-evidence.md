# TASK-011 implementation and actual evidence

23 October 2026. Issue [22](https://github.com/Dihoccode1/Vinlook/issues/22). Approved owner Tú; human reviewer Duy. Contract A approved before code. Publication via Duy connector/AI assistance does not impersonate Tú authorship or human approval. Review/merge pending.

## Delivered

Explicit Content factory for POI/POIRevision/LocalizedContent with owned collection names, strict nested schemas, exact16locale enum, safe numeric versions, independent GeoJSON marker/entrance, nullable partial media and explicit approval/version/duration pairs. Asset refs are structural credential-free HTTPS metadata only; no fetch/upload, binary or provider response. Factory opens no connection/index and imports no Identity models. Added exact Mongoose9.11.3 workspace dependency; existing hoisted runtime version unchanged.

Actual indexes include unique revision number, unique revision/language, one cross-status partial unique working-revision index, location2dsphere and approved simple indexes. Published history is outside the working slot. No TTL, schema/data migration, app startup connection, API or real POI seed added. [Model boundaries](../../services/content/src/models/README.md) explain the required later API/publication/geography checks.

## Executed checks

- **7/7** disconnected groups: factory/options/nulls/no connection; soft-delete/IDs/dates/strict nesting; exact finite numeric GeoJSON rejecting string coercion; Unicode name/source/version/status/published metadata bounds; asset HTTPS/credential/query/control/shape checks; all16locales/review pairs/approved duration90/150 inclusive/version consistency and pending stale output; safe error summaries.
- **6/6** real Mongo groups: exact collections/unique/partial/geo/noTTL definitions; revision uniqueness with multiple published history rows; simultaneous draft/in_review exactly one winner via unique(poiId) partial index; publishing releases that slot, new working revision permitted while history retained;16language rows plus per-revision uniqueness; actual geo proximity query/invalid raw geometry rejection; Content-owned POI/revision/localized transaction abort rollback.
- Deliberate raw invalid-approved localized fixture succeeded, proving document validation is not arbitrary direct-DB publication enforcement. It remained isolated and was removed with the disposable database. No false claim of immutable publication/full16language gate follows from schema validation.
- **27/27** relevant regressions:7Identity schema,15runtime and5caller/adapter groups passed. Current unique passing total **40groups**, no skips. Full workspace build and three-service HTTP smoke passed, listeners closed. Historical operator/provider/routing/other Mongo suites were not all rerun or double-counted.
- Exact dependency install succeeded; npm reported zero vulnerabilities at install time, not a complete security audit. Runtime bcrypt install-script notice unchanged; no new script approval or dependency version upgrade beyond the approved Content workspace declaration.

## Environment failures retained

Initial Docker launch failed because Engine was stopped. Started the existing Docker Desktop hidden; startup/build/execution became slow and pending shell session IDs were subsequently unavailable. Those incomplete build/regression sessions have no confirmed exit status and are **not** counted as passes. After verifying Engine29.8.2, ran the unchanged build and27regressions again to confirmed exit0, then actual Mongo6/6 and smoke. Original disconnected7/7 already had confirmed exit0; no schema fix or weakened test was needed. No cause is fabricated for the lost execution sessions.

## Isolation/reproduction

`npm run test:content:db` only accepts `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task011-mongo-[A-Za-z0-9_-]+`, exact label `vinlook.task=TASK-011`, pinned `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback published port and replica set `vinlook_task011`. It derives a fixed local URI for `vinlook_content_task011`, requires zero existing collections, then explicitly builds only fixture catalog. No arbitrary URI/Atlas/real credential accepted.

Create an unused matching container with that label/image, publish `127.0.0.1::27017`, run mongod `--replSet vinlook_task011 --bind_ip_all`, initiate one member at`127.0.0.1:27017`, wait for primary, set container-name variable and run suite. `npm run test:content` needs no Mongo. Primary references: [MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/), [Mongoose per-path casting](https://mongoosejs.com/docs/api/schematype.html#SchemaType.prototype.castFunction()). Actual pinned Mongo, not documentation alone, provided index evidence.

Only actual TASK-011 container `vinlook-task011-mongo-content` was created (the earlier stopped-engine attempt created none). Exact returned ID/task label/anonymous-volume-only `/data/db`/`/data/configdb` mounts checked before stopping/removing it and its own volumes. No task DB/container/server remains; unrelated containers/volumes not stopped/deleted.

## Remaining gates

No actual HCMC boundary/entrance/15POI/source accuracy,16published language contents, registry/media verification, Content APIs/jobs/outbox/idempotency, Atlas indexes or hosted release proved here. Model document rules can be bypassed by query/raw writes; API tasks must enforce them with validated conditional transactions and immutable publication rules. TASK-010 native human TTY/real operation acceptance remains pending independently. Overall readiness503. Await Duy human review/user merge; local fixture success is not product acceptance.
