# TASK-019 — upload approach decision

23 October2026. Actual Issue28 https://github.com/Dihoccode1/Vinlook/issues/28. Owner Duy; reviewer Tú. TASK003/011/006 merged; integrate with TASK012/015. No code, credentials, Atlas change or real upload in this step.

## Existing approved requirements

Signed upload, no unsigned public preset, server-owned namespace/ID/type/version intent; secret never in browser/worker. Server verifies actual asset/type/size/duration before attaching. New asset ID on replacement, no overwrite of published/offline cache references. Unattached uploads retained for reconciliation through revision/job, no automatic deletion. Thumbnail JPEG/PNG/WebP up to2MB and1600x1600; audio MP3 mono up to3MB,90–150s, target64kbps. TASK013 depends on this verifier; merged TASK012 rejects nonnull production thumbnail until it is supplied.

## Verified provider limitation

Official Cloudinary authentication_signatures documentation says upload signature is valid1hour from timestamp and excludes file/cloud_name/resource_type/api_key from signed fields. Thus a server signature cannot independently prove file contents or the uploader's selected resource_type. Do not describe it as a cryptographic byte/type restriction or a5/15minute provider expiry. Signature TTL and application intent acceptance TTL are distinct. API secret remains server-only. Sources checked23October2026:
- https://cloudinary.com/documentation/authentication_signatures
- https://cloudinary.com/documentation/image_upload_api_reference

## A — direct signed upload (recommended for the prototype)

Content issues a server-owned durable upload intent tied to verified actor/session, revision/job, expected kind and source/text versions. Return only signed fixed parameters, public API key and exact Cloudinary upload endpoint. Timestamp is server current time, provider signature lifetime1hour; application intent must expire no later than the same absolute bound. Unique public_id for each intent, overwrite=false signed; never return secret or a generic signing oracle. No unsigned/public preset. Caller can send bytes directly to Cloudinary, sparing Render the upload bandwidth.

After upload, client submits intent/reference only; Content independently checks the expected configured account/resource/type/namespace/version and bounded actual file bytes/header/metadata before it accepts the reference. Ignore caller URL/duration. Wrong type/version/size/expired or stale source fails closed; provider failure503. An uploaded wrong resource can remain unattached: rejection cannot undo consumed provider quota. Altered resource_type/file is not claimed to be blocked by the signature itself. One immutable accepted resource per intent; no automatic delete for rejected/orphan assets. Staff attachment still uses TASK012 expectedEditVersion/atomic audit. Worker authorization/audio integration must use its later approved job contract, not a new public staff-signing bypass.

Benefits: consistent with approved direct signed upload direction; smaller backend bandwidth/load, no new service. Cost/limits:1h bearer upload capability and unavoidable unaccepted/orphan uploads; durable intent schema, byte probing and actual provider verification must be concretely approved/implemented. This choice does not automatically approve new fields or a free-tier quota/performance claim.

## B — server-proxied upload

Browser/worker sends bounded bytes to Content; Content alone signs/forwards to Cloudinary. Local authorization/version/intent/time and byte inspection occur before provider upload; no upload signature is exposed to browser. This can enforce a shorter local acceptance window; it does NOT change Cloudinary's underlying1h signature rule. Requires approved streaming/body limits, temporary storage/probe cleanup, cancellation, idempotency and upload request timeouts. More Render bandwidth/memory and cold-start/request-duration exposure. Adds no paid service, but free-host feasibility must be measured. This revises the transport direction of the approved design and may affect schedule; no deadline extension is presumed.

## Decision and next deliverable

Choose A or B. Same product scope/owner/reviewer/free-only constraint. With A, accept honest provider1hour lifetime plus independent post-upload verification; with B, accept extra server upload transport work and measure feasibility. Then prepare one complete TASK019 implementation contract specifying intent schema/indexes/state machine, routes/payloads, exact byte units/limits, signature algorithm/parameters, provider timeouts/quota handling, binary probe/runtime pins, reconciliation, thumbnail integration and fixture/live-test separation. Do not implement unspecified model/probe/config details on the strength of this approach approval alone.

Master Prompt Rule1 requires asking before API/data/architecture/deployment choices; this newly verified provider limitation motivates the question. No old TASK012/TASK015 approval is reopened. TASK013 remains pending on TASK019 acceptance.

Decision23October2026: user selected B — upload through backend. Recommendation A is superseded; no further transport choice needed. Concrete contract follows separately.
