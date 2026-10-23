# TASK-016 — implementation and isolated evidence

24October2026 UTC+7. Issue34; user approved detailed A for isolated implementation/testing. Owner Duy (Dihoccode1), human reviewer Tú (ngoctu0405). Not Done until human review/user merge. Actual translation/TTS execution and model/registry selection are outside this slice.

## Implemented

Strict Content ProcessingJob with typed source/text/destination snapshots, canonical hash and working-job partial unique index. Staff Process/Retry/read/status reuse fresh authority/open session, transactional parent/revision writes, outbox and24h replay. Progressive translation-to-audio queues English audio plus15translation jobs initially; accepted translation creates its exact audio job. Current good outputs are retained.

Scoped local-worker credentials/capabilities, one atomic claim/5min lease,60s renewal, max3reclaims then failed/manual retry. Factory-only server-adapter scope cannot be selected by local HTTP worker. Source/text/manual destination versions and current draft/deletion state gate results; metadata-only edits survive. Receipts avoid duplicate output/outbox and preserve original actor/session completion audit. Localized output/follow-up/job receipt/counters/outbox commit together, with provider verification outside transaction.

Restricted worker media intent/upload/reconcile reuses backend probe/provider/digest pipeline with immutable MediaUpload.attemptId (null thumbnail). Live admission prevents another attempt using it. Lost lease during an already admitted provider upload leaves unattached verified/uncertain bytes; stale result denied. Unknown provider outcome never automatically uploads again. No public audio write bypass, actual model/provider call, physical delete or cleanup.

## Actual checks —142 unique passed groups; no skips in final suites

-15 jobs Mongo/HTTP integration groups, latest full run exit0,16.130s. Actual loopback Content/Identity/provider adapter with synthetic registry/text/silent MP3; not actual speech or provider-account acceptance.
-65 unit/relevant regression groups exit0,13.487s:4jobs +5lifecycle +4publication +8media +4draft +6durability +7Content schema +7Identity schema +5authorization +15runtime-health.
-14 draft Mongo integration exit0,7.792s.
-17 lifecycle/public Mongo integration exit0,16.488s.
-16 publication Mongo/provider-loopback integration exit0,35.515s.
-15 media Mongo/provider-loopback integration exit0,13.683s. Sampled fixture parent RSS214552576bytes is not Render/50-user capacity acceptance.
- Full workspace build exit0 (Web/Content/Identity/Usage). Existing truthful readiness503/no-store/independent listeners retained.

Jobs evidence proves16initial jobs with no English translation; process replay/active conflict and safe status read; single concurrent claim; local caller cannot claim translation; exact source/destination versions; translation receipt/follow-up once and actual Identity receiver delivery under original closed session; worker MP3 upload/verified attachment/receipt once; foreign intent and stale attempt denial; metadata edit valid vs changed source/in_review/deleted denial; exact5min expiry/renewal refusal/3reclaim cap; terminal quota/manual retry/new attempt; process/retry/result outbox rollback; lost upload ACK read-only reconciliation/no second upload; verified new Content connection retains lease; revoked key and scope injection denial; lost lease during provider side effect leaves unattached bytes; expired result deadline admits no write. No full real31-output POI pipeline/narration acceptance is inferred.

## Iterations and limits of evidence

Initial jobs run0passed/10failed before DB access: helper named process shadowed Node process.env in fixture setup. Renamed helper processJobs; unchanged initially-empty fixture rerun10/10passed. This failure is not counted as a business pass. Later14group suites passed; final15group suite adds stronger retry rollback, foreign intent and stale state assertions. Earlier overlapping4unit/12unit/10integration/14integration runs counted once only.

Manual review added job input-hash/state validation, precise stale-attempt ordering, remaining-budget query limits/result deadline, and preservation of safe admission errors through media upload. Tests use synthetic fixed fixture credentials; no real secret was read, printed or saved. Result deadline reuses publication's tested middleware; shared unfinished-body timeout error is safe503 PUBLICATION_VERIFICATION_UNAVAILABLE. No real60/90second hosted timing, independent worker renewal-thread benchmark, actual subprocess restart or production capacity claimed: restart proof here is a verified NEW Mongo/Content connection; prior media regression separately proves a fresh Node reconcile process.

## Fixture isolation / cleanup

Pinned image mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907; guards exact task prefix/label/image,127.0.0.1binding, expected replica set and initially empty owned DBs. No arbitrary live URI. Synthetic setup alone creates test collections/indexes.

TASK016 fixture full IDs:
- vinlook-task016-mongo-jobs:85674dba53b764fd2bcd8220b964ebb814766bd84bf2ad1adddfb4b1b5d78089
- vinlook-task016-mongo-acceptance:c5a6545ba19bbc85b9db834ff919d60d846faa6ebcf27305507bebb31746a961
- vinlook-task016-mongo-final:82f1816d55e57464a29de17fa8c0276ab77216ba8d657649dc1bf4e58131964d
- vinlook-task016-mongo-reviewed:1bd780bd0ac668eee961285aca0f5ddfb84173d8e9c08767314bade5508c9dd1

Regression fixture full IDs:
- TASK019/d09a80a437fa3a3f9a6704a9162addee7176d5957c4c73c1e5c12433ed505452
- TASK013/3747b90b5a95e7afea2aabb55751192f2e44706e374920b573855ceb6cb9893a
- TASK014/4e8f1f595fc7de5d88d8639ac1fe43a79eb9a6deec5d350ffb27777a14473911
- TASK012/394626216bd348b62a5ecc20e399258ad13a5ae79ff538115a88f6129435411d

All8containers/own volumes removed after full ID/task label and volume-only /data/db or /data/configdb mount checks. Unrelated containers/volumes/images/engine untouched.

## Runtime/release gates still pending

No actual model or processingManifest loader selected; ordinary runtime fails processing/worker actions closed without an explicitly injected approved manifest. Optional caller credential is private configuration only; no real key/setup. Existing processing_jobs catalog is verified read-only; no real Atlas provisioning/backfill. Existing nonjob catalogs/admin/public APIs remain available under their original gates. No actual provider upload/translation/TTS, model download/Python/FFmpeg execution, worker polling/renewal client deployment, HTTPS ingress configuration, CI/CD deployment, real dataset/quality, offline,50-user or complete product acceptance. Runtime readiness remains503; TASK010 native human operator acceptance remains separate. No broker/paid fallback/auto-merge/human-review impersonation.
