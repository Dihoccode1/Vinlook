# TASK-013 — implementation and isolated evidence

24 October2026 UTC+7. Issue30. User explicitly approved contract A for isolated implementation/testing. Owner Duy; human reviewer Tú. Not Done until human review/user merge. TASK012 PR27 and TASK019 PR29 code prerequisites verified merged.

## Result

Added strict review/submit/return/publish routes using existing models and durability primitives. All16 locale outputs must be current, approved and independently verified against immutable same-POI media provenance and an explicitly approved manifest. Manager-only publication atomically changes status/pointer and stores audit/replay. Old published revisions/localized content/media remain unchanged. Same-key replay rechecks current role/session but skips provider. Snapshot recheck catches changes during verification; parent counter catches concurrent delete. Client disconnection/deadline propagates AbortSignal to media reads. No new dependency, collection, index, registry selection or configuration loader.

Ordinary Content runtime has no approved publicationRegistry injected by this slice, so approve/submit/publish fail closed until actual registry integration is explicitly provided. Synthetic test manifest is not a production registry. Overall readiness remains503. Public reads remain TASK014, jobs/worker authentication remain TASK016 and later pipeline work. Manager's confirmGeography is a human attestation, not proof from a boundary algorithm or actual route survey.

## Actual checks —113 unique passed groups, no skips

-16 publication integration groups, final run exit0,19.954s: actual Content and Identity HTTP, real local Mongo transactions, existing Cloudinary adapter against a strict test-only loopback transport. Synthetic valid silent MP3 frames/WebP and typed verified MediaUpload fixtures; no actual narration/translation or provider upload. Final fixture vinlook-task013-mongo-final.
-56 unique unit/relevant regression groups: combined55group elevated run exit0,13.063s, then final4publication tests exit0,0.833s with3overlapping tests counted once. Total4publication,8media,4draft,6durability,7Content schema,7Identity schema,5authorization and15runtime-health. No double counting of earlier20group subset.
-14 draft integration groups exit0,6.124s, fixture vinlook-task012-mongo-publication-regression.
-15 media integration groups exit0,9.764s, fixture vinlook-task019-mongo-publication-regression. These include synthetic loopback upload/probe/reconciliation, not a real Cloudinary account.
-12 durability integration groups exit0,7.703s, fixture vinlook-task015-mongo-publication-regression. Covers concurrency, real new-process replay/quarantine, receiver failure and unknown commit outcome.
- Full workspace build reached successful Web/Content/Identity/Usage completion; final Content build exit0 after deadline middleware hardening. No changed dependency lockfile; scripts-only package metadata edits. Runtime-health verifies independent service health/no-store/truthful503.

Publication integration proves: exact-version English review and re-review; submit lock/return-edit invalidation; Manager self-publication; replay without provider even when provider becomes unavailable; missing/stale/unapproved/model/English/duration gates; incomplete-row rejection reason; strict body/type/size; missing manifest/verifier; redirect/corrupt/provider failures; concurrent review-vs-submit one winner; same-key publish converges/different keys publish once; snapshot changes in flight; immutable old graph and clone reuse; outbox rollback including no durable replay record; fresh role/pending/locked/session/Identity denial; deadline and actual in-flight HTTP abort; actual parent-write vs delete conflict; ambiguous in_progress quarantine; cross-POI media, overflow and corrupted pointer; durable audit later reaches original Identity session.

## Failed/diagnostic runs retained honestly

- Initial integration run had successful-gate failures and a fixture hold waiting for a provider call that never arrived; its exact two Node processes were inspected and stopped, not counted as passed. A second diagnostic run reached the same issue; it ended without leaving a Node process. Added a race against the pending request so a failed provider hold does not wait silently.
- Focused2case diagnostic:0passed/2failed. Fixture transport assertion omitted /v1_1 in the Cloudinary API URL; fixed the allowlisted fixture path, not the production adapter. Actual MongoDB driver rejected per-operation timeoutMS inside withTransaction with its own timeoutMS. Fixed service to inherit the transaction deadline there and use bounded operation timeout only outside. Temporary diagnostic stack printing removed before delivery; only synthetic fixtures were present.
- Next full11group integration passed; expanded15group passed; final16group passed after adding an actual provider abort and correcting replay-record rollback assertion to query its actual key. Added concurrent-completion replay handling during manual review before final evidence. Earlier runs are not added to final count. Final manual review added explicit503/connection closure for an unfinished JSON body at the absolute deadline, plus a fake-clock middleware test for unfinished/complete requests; no60s real-device/hosted timing claim.
- First combined55group regression:50passed/5failed because sandbox denied HTTP loopback (EACCES), affecting2authorization and3health cases. Re-ran unchanged55tests with loopback permission:55passed/0failed. No test skip or weakened assertion.

## Fixture isolation and cleanup

Pinned image mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907. Each test guards exact task name prefix, vinlook.task label, pinned image,127.0.0.1 binding, expected replica set and initially empty owned DBs. No arbitrary URI/environment credentials. Test schema/index creation only after these guards.

TASK013 fixtures (full IDs):
- publication:8e3152266ce4a3ae0b559508e75cb36228ee1523a1e7e11e558de9f51cbaddd8
- diagnostic:92ea5a003820e8912115538a84df57bf395fde560d8fe32e23ef1a58fde860ce
- errors:23cf557cb58a58ed52f53a95a8a2a0bba0aebc2f0f8e08587bd62ccd180a0133
- fixed:78348018aaf5a1b22f27f3ca06c5135b065de83b661cb95d58ce026a12a45085
- acceptance:444c7be3ac56af1f9cf40dc1d73f730b13e7392c3a9b0abbfb966ee4ed09fcfa
- final:9457f3b7ee8ad295d9c4338f37fd7eda52b35a88198c33aad77d848f02bb0723

Regression fixture IDs:
- TASK012:7a80921ef4358c83ac28753435926b0fc746f80fd451d494a5d4032d1d15f24f
- TASK019:4b072b087318ec25ac948b8fe6128a6d74c870bae7f6480c6eaac2192d231f04
- TASK015:b43d74a1a3bcb78c429cb95d6ab933bda10f656797d688fcc25ef1300dc2e73e

First5TASK013containers and their volumes already removed after exact ID/label/volume-only mount checks. Final and3regression fixtures also removed after matching full ID/task label and volume-only /data/db or /data/configdb mounts. All9containers and their own volumes removed; unrelated resources untouched.

## Limits and release gates

No real Atlas/Cloudinary request/upload, real keys, account settings, actual POI seed, deployment or operator action. Fixture data is not evidence of correct speech/content/geography. Read-only external verification cannot be atomic with future out-of-band provider deletion.60s deadline is a chosen bound, not measured Render/free-tier latency/capacity acceptance. No performance/50-user/whole-system completeness claim. Actual approved model manifest/worker integration, real provider acceptance, hosted public delivery and TASK010 native human terminal acceptance remain independent gates. No automatic paid fallback, model substitution, history cleanup, cross-DB transaction or human-review impersonation.
