# TASK-011 — Content model/index implementation contract

23 October 2026. Issue [22](https://github.com/Dihoccode1/Vinlook/issues/22). Approved owner Tú; human reviewer Duy. Dependency TASK-002 merged. TASK-010 code PR21 also merged e7d3327dc9d545e078f65c3606dd883ccee4f140; its native human terminal acceptance remains pending separately. Proposal A fills exact schema/index/asset choices under Master Prompt Rule1; no TASK-011 code yet.

## Scope and existing approvals

Implement only Content-owned POI, POIRevision and LocalizedContent, using the same pinned Mongoose9.11.3 as Identity. Collections `pois`, `poi_revisions`, `localized_contents`; factory takes an explicit Content connection, opens none. Strict top-level/nested allowlists, no Mongo Mixed/binary/secret/provider payload, autoCreate/autoIndex/buffering disabled, versionKey=false. ObjectId references to Identity stay logical; no cross-DB populate/joins or Identity imports.

No HTTP write/read API, provider integration, Atlas index provisioning, job/outbox/idempotency collection, real POI seed or production connection added. Content startup/health stays unchanged and readiness503. Later API tasks must enforce conditional writes, review/publication gates and approved historical preservation; schemas are not those APIs.

## Proposed A — Fields/defaults

| Model | Concrete fields |
|---|---|
| POI | `_id` ObjectId; publishedRevisionId nullable ObjectId defaultnull; deletedAt nullable finite UTC Date defaultnull; deletedBy nullable ObjectId defaultnull; createdAt auto timestamp only, no implicit updatedAt |
| POIRevision | poiId required ObjectId; revisionNumber required safe integer>=1; editVersion required safe integer>=0; sourceVersion required safe integer>=1; status required draft/in_review/published; nameEN required trimmed1–200Unicode codepoints; location required GeoJSON Point; entrance nullable Point defaultnull; thumbnailAsset nullable strict asset defaultnull; sourceTextEN required trimmed1–20000UTF16 units; createdBy required ObjectId; createdAt/updatedAt auto timestamps |
| LocalizedContent | revisionId required ObjectId; languageCode required exact enum; sourceVersion/textVersion required safe integers>=1; text nullable defaultnull (otherwise trimmed1–20000UTF16 units); audioAsset nullable defaultnull; durationSeconds nullable defaultnull, otherwise finite>0; reviewStatus required pending/approved/changes_required; reviewedBy nullable ObjectId/reviewedAt nullable finite Date defaultnull; no implicit timestamps/extra fields |

No automatic business state/version defaults except explicit nullable fields: later writers must provide versions/status. Suggested initial API values revisionNumber1/editVersion0/sourceVersion1/textVersion1 remain the values to implement in their approved API task, not hidden schema side effects. No max15POI constraint:15 is the initial curated dataset, not the database capacity limit.

POI deletedAt/deletedBy must both be null or both present. Schema declarations do not prove publishedRevisionId belongs to that POI; this cross-document pointer must be checked by the later publication transaction.

## Proposed A — GeoJSON and assets

Point subdocument has only `{type:'Point',coordinates:[longitude,latitude]}`, no nested _id. Exactly2 finite numbers with longitude[-180,180], latitude[-90,90]; no coercion of arbitrary strings/objects into accepted coordinates. Entrance is distinct from marker; absent entrance stays null, never substituted with location. Model validation does not establish current HCMC polygon membership or a physically valid walking entrance: later import/admin API/data review must verify those against approved geography. Synthetic fixtures are not actual15POI coordinates/evidence.

Thumbnail asset: strict `{publicId,url,format}`; publicId trimmed1–512UTF16 units without ASCII control characters; url canonical credential-free HTTPS with no query/fragment; format lowercase alphanumeric1–16. No asset binary, API key/signed secret URL or arbitrary provider response.

Audio asset extends that shape with required safe integer textVersion>=1, registryVersion matching `[A-Za-z0-9._-]{1,100}`, voiceOrModelId trimmed1–200 without ASCII control characters. Duration is stored **once**, at LocalizedContent.durationSeconds (no duplicate audioAsset duration field). These structural format/HTTPS checks are not a media header/host ownership/format allowlist verification or permission to fetch arbitrary URLs. Actual adapter must verify approved Cloudinary ownership, file bytes/duration and immutable references later; no upload/fetch in this task. Synthetic asset IDs/registry/model tags only in tests.

## Proposed A — Document validation versus publication

- Published revision documents require entrance and thumbnail in addition to required name/location/source text. Draft/in_review may omit these metadata fields while work is incomplete. Persisted published immutability still belongs to later conditional API writes; no claim that arbitrary updateOne/bulkWrite/raw Mongo is prevented by these document validators.
- Audio asset and duration must both be null or both present. Missing text/audio is valid pending/incomplete processing state. Pending review requires reviewedBy/reviewedAt null. Approved or changes_required requires both reviewer ID/time; no assertion of that reviewer's historical role from an ObjectId alone.
- Approved localized document additionally requires nonempty text, matching audioAsset.textVersion==textVersion, audio and duration90–150seconds inclusive. Nonapproved audio may have duration outside that window or older textVersion to preserve a stale/rejected result for repair; it must not be treated as publishable. No automatic review/version invalidation happens merely by saving through a model.
- Parent revision sourceVersion/English text consistency, exactly16approved current language rows, actual registry/voice/media validity, permission/current session and immutable publication pointer checks are cross-document/API gates for later tasks. Models do not fabricate those results or silently delete stale/history data.

Exact approved16-language enum: `en`, `zh-Hant`, `hi`, `es`, `ar`, `fr`, `bn`, `pt-PT`, `id`, `ur`, `ru`, `de`, `ja`, `pcm`, `ar-EG`, `vi`. Provider voice selection is not changed or finalized by this schema task; Azure research wording remains historical after the approved hybrid change.

## Proposed A — Indexes

- POI: `{deletedAt:1}`.
- POIRevision: unique `{poiId:1,revisionNumber:1}`; `{location:'2dsphere'}`; `{poiId:1,status:1}`; **unique `{poiId:1}` with partialFilterExpression `{status:{$in:['draft','in_review']}}`**. That one partial index covers both working states, preventing simultaneous draft+in_review. Published revisions are excluded, allowing history. Do not substitute separate per-status unique indexes.
- LocalizedContent: unique `{revisionId:1,languageCode:1}`. No unique textVersion across different languages/revisions.
- No TTL, text-search provider, arbitrary extra geo/field index or migration. Entrance is validated but has no extra index because this task has no entrance-proximity query. Real isolated Mongo must prove geospatial/partial/unique index behavior; no Atlas performance/storage claim.

## Evidence and limits

Disconnected validation tests cover strict/nested/date/ID/Unicode/version/review/media shape and safe error summaries (known field names/stable codes only, never rejected values). Real guarded disposable TASK-011 loopback Mongo proves duplicate revision/language rejection, concurrent draft versus in_review one winner, working-state slot release versus retained published history, valid/invalid GeoJSON index writes and transaction rollback. Inspect actual index definitions; tests explicitly create them only after verifying empty task-owned DB/container label/pinned image/loopback/replica set.

No real Atlas/POI/asset/provider write. Existing relevant scaffold/runtime/build checks remain green. Document/path validation can be bypassed by query/direct operations; later APIs must validate candidate state or equivalent conditional transaction checks. Preserve owner Tú/reviewer Duy, no remote assignment or impersonated authorship. Draft PR after actual checks; human review/user merge before Done. Operator terminal acceptance from TASK-010 remains an independent operational gate.

## Decision

Approve A together: exact collections/field bounds/nullability, asset/version/review shapes, enum and single cross-status partial unique index plus honest API/geography boundaries; or specify changes. Master Prompt Rule1 requires approval for these previously unspecified data details. Existing TASK-010 merge is not being reopened, and no private credential is requested.

Approval: Duy explicitly approved A (implement and test),23October2026. Proposal wording retained as history.
