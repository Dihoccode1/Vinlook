# TASK-013 — Review, submission and atomic publication contract A

Actual Issue [30](https://github.com/Dihoccode1/Vinlook/issues/30).

24 October 2026 (UTC+7). PROPOSED — approval required before code. Owner Duy (Dihoccode1), human reviewer Tú (ngoctu0405); existing 8h estimate is not a completion promise. TASK012 PR27 and TASK019 PR29 are merged; TASK015 provides transaction/outbox/replay. Traceability: REQ012/017/018/019; FEAT003/004/005; US011/012/014/018/022; UC015/016; AC012/017; TC015/016. Approved D006 endpoint families and in_review edit lock are retained.

## Scope and alternatives

A (recommended): per-language staff review in draft, submit only a fully approved current set, Manager returns with reason or publishes atomically. Reuse existing three business models, MediaUpload and durability infrastructure; no new collection, index, dependency, public read API or job endpoint. This gives explicit review evidence with minimal extra infrastructure. A missing real pipeline/provider/registry gate remains unavailable rather than being fabricated.

B: add a separate immutable review-history collection and staged approval workflow before publication. This gives richer review history but changes schema, runtime catalog and effort; it is not required by the approved prototype baseline. Choosing B requires a replacement detailed contract before implementation.

## Authority and transport

Prefix /api/v1/admin/revisions/:id. Fresh Identity authority for every request/replay; all writes need the actor's current open work session. Staff and Manager share draft workspace, may review and submit; only Manager returns/publishes. Self-review and publication of one's own edits remain allowed. No creator restriction. Retain admitted-request authorization boundary from TASK012: a later lock/session closure is not a distributed rollback.

Strict JSON <=16KiB, no query inputs; reject unknown fields, malformed JSON400, type415, size413, invalid422. Canonical IDs, safe nonnegative expectedEditVersion, English fixed safe error messages, no-store/requestId and existing exact-origin CORS. Never accept actor, session, timestamps, status, versions to write, asset URLs or provider credentials from clients. Responses: {data:{poiId,revisionId,editVersion,status},requestId}; no audit/replay/provider internals.

## Proposed endpoints

1. POST /languages/:code/review body {expectedEditVersion,expectedTextVersion,decision:"approved"|"changes_required",reason?}. All16 codes including en. Only draft/current version/nondeleted POI. Expected text version must match an existing row whose sourceVersion matches the revision. Approval requires nonempty text, current verified MP3 audio, matching audio.textVersion, duration90–150 inclusive, registered language/model provenance and English text equal to sourceTextEN. Server writes reviewStatus/reviewedBy/reviewedAt. changes_required requires trimmed reason1–500 UTF16 units; may mark incomplete current row as rejected, without requiring valid audio. Approval forbids reason. Repeating identical decision with matching version is a new explicit review, updates reviewer/time and increments editVersion; old-version retry409. One content.review outbox event, reason only when supplied. No extra review history document; existing outbox records event/actor/time/POI/reason, not a new claim of per-language audit columns.

2. POST /submit body {expectedEditVersion}. Only draft. Require exactly16 distinct expected locale rows, all approved/current with text/audio/duration, entrance and thumbnail present, source English equality and verified media/registry as below. Move to in_review; increment editVersion once, emit revision.submit. No automatic job or publish. Incomplete/stale set409 PUBLICATION_NOT_READY; stale expected version409 EDIT_VERSION_CONFLICT. Already in_review is409 REVISION_STATE_CONFLICT, not implicit replay.

3. POST /return body {expectedEditVersion,reason}; Manager only, in_review only, trimmed reason1–500. Move to draft, increment editVersion, emit revision.return with reason. Retain localized approvals when no dependent content changed; future edits invalidate through TASK012. No automatic changes_required for all locales, no pointer/media change. Retry old version409.

4. POST /publish body {expectedEditVersion,expectedPublishedRevisionId:null|canonicalId,confirmGeography:true}; Manager only, in_review only. Required canonical UUID Idempotency-Key. expectedPublishedRevisionId guards against moving a pointer different from what the Manager reviewed. confirmGeography is explicit human attestation that marker and entrance were checked against the approved current HCMC boundary and actual pedestrian entrance; it is not an automated polygon/physical-access proof. No checkbox can replace actual human checking. Missing/false confirmation422. This slice does not introduce a new boundary library, dataset, routing engine or geographic database fields.

## Current-output and external-media verification

All submit/publish gates check exactly the approved16 language codes, current sourceVersion, nonempty text, reviewStatus approved with reviewer/time, audio.textVersion equal textVersion, finite90–150s duration, English equality, entrance and thumbnail. Draft/published content cannot be supplied through request bodies. Published pointer if nonnull must resolve to a published revision of this POI; invalid persisted graph503 CONTENT_STATE_UNAVAILABLE.

Use TASK019 verification for thumbnail and each audio, matching POI/sourceVersion/textVersion/language and exact immutable reference; compare returned actual duration to stored duration. Reused immutable assets from a published clone are allowed only with that same provenance; do not demand original revisionId equals clone ID. Revalidate at submit and publish; review approval validates its own audio. Merely having https, model-name syntax or approved=true is insufficient.

Registry contract: require a server-owned immutable approved manifest {registryVersion, languages:{code:{voiceOrModelId}}}; exactly16 codes, strict nonempty identifiers with TASK011 bounds. Audio must match its locale's exact manifest version/model. This does not select or silently approve real MMS checkpoints/Gemini models. Factory accepts an explicitly approved manifest; ordinary runtime with no approved manifest returns503 PUBLICATION_VERIFICATION_UNAVAILABLE for approve/submit/publish while other existing operations continue. No new environment configuration or permissive production fallback in this slice. Synthetic manifest is test-only. Integration of actual resolved registry is a later explicit acceptance gate, not an extra completed dependency.

Verification uses read-only provider calls outside Mongo transaction, sequential and bounded by a total60s request budget (including authority); propagate remaining budget/AbortSignal through TASK019 verifier and provider methods. No upload/retry/delete side effect. Missing verifier/manifest or provider unavailable/timeout503; mismatched verified reference422 INVALID_MEDIA_REFERENCE. These availability bounds may reject a slow valid set; no claim of measured free-tier latency. No external calls inside transaction. Capture snapshot with revision editVersion, sourceVersion, locale versions/reviews and immutable media IDs; re-read/check in transaction. Concurrent mutation409; never publish a different graph from the one verified. Provider deletion after verification remains an external race; no cross-provider atomicity promise.

## Transaction, history and retry

Every successful review/submit/return/publish increments revision.editVersion and POI.mutationVersion once, with safe overflow409 VERSION_EXHAUSTED; conditional parent write requires nondeleted matching mutationVersion. Recheck state/expectedEditVersion and full relevant graph inside same Content transaction. All future job completion writers must follow this revision/parent version protocol; TASK016 not implemented here. No concurrent worker endpoint is enabled by this contract.

Publish uses existing operation revision.publish with TASK015 actor/key/hash scope and24h replay. Hash includes normalized revision ID and complete publish body. Replay after fresh Manager/open-session authority returns original minimal committed result, even if current POI later changes; it does not call provider again. Changed payload409 IDEMPOTENCY_CONFLICT; ambiguous in_progress remains quarantined, never automatically publish again. Review/submit/return do not add idempotency operations; lost response uses GET existing TASK012 detail then explicit user retry after409.

Publish transaction sets target status published, increments versions, updates POI.publishedRevisionId and appends revision.publish outbox and replay result atomically. Old published revisions retain status/content/assets/reviews byte-for-byte; multiple historical published revisions are allowed, exactly one current pointer. No archive enum, overwrite, cleanup or republish of a published revision. Subsequent edit uses TASK012 clone. A failed commit/outbox/version check leaves public pointer and published graph unchanged. Majority/primary and bounded contention retries reuse TASK015, remaining deadline applies. DB uncertain503; no success inferred. Identity receiver failure after commit does not undo publication: pending audit delivery stays durable.

## Test and completion gate

Only isolated synthetic tests: labelled pinned loopback replica set, actual Content/Identity HTTP and loopback provider. Prove all16 including en, missing/stale/unapproved/duplicate/corrupt rows, wrong duration/registry/media/POI, disabled verifier/manifest, provider timeout/redirect failure; no provider calls on replay. Staff direct publish/return denial; pending/locked/current-role/session checks, self-review allowed; strict bodies. Same-version review/submit races, return-edit flow, concurrent publish one winner, lost response replay/conflicting key, parent delete race and corrupted pointer; transaction/outbox failure rollback, retained old graph/assets, clone after publish and no audit loss on receiver failure. Add tests for snapshot change during provider verification and request cancellation/deadline. Relevant regression/build/health; no test count predicted.

No real Atlas, Cloudinary upload, credentials, Manager bootstrap, worker synthesis, UI, hosted deployment or product readiness acceptance. Overall readiness remains503 until release gates pass. Publish here means internal pointer transition; public read delivery belongs to TASK014. Human Tú review and user merge required before code Done. TASK010 human terminal acceptance remains separate.

## Decision requested

Approve A for isolated implementation/testing, including review/version semantics, submit/return gates, expectedPublishedRevisionId, explicit geography attestation, fail-closed approved registry manifest,60s verification budget and existing durable publish replay. Or specify changes / choose B. Master Prompt Rule1 requires approval for these previously unspecified API/runtime details; no code is authorized by this proposal alone.

Approval: user explicitly approved A — isolated implementation and testing,24 October2026 UTC+7.
