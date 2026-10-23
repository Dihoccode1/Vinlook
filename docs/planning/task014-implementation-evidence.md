# TASK-014 — implementation and isolated evidence

24October2026 UTC+7. Issue32. User explicitly approved contract A for isolated implementation/testing. Approved owner Tú (ngoctu0405); human reviewer Duy (Dihoccode1), unchanged. AI-assisted implementation does not constitute human review. Await draft PR/human review/user merge before code Done.

## Result and limits

Manager-only soft delete and restore use existing conditional parent writes and atomic outbox/replay. Restore clears public pointer, reuses existing working revision or clones retained published revision, resets approvals and preserves immutable historical data/assets. Admin detail adds the existing mutationVersion. Fresh authority still applies on replay; no provider side effect or physical delete.

Added public selected-locale list/detail, English-name literal search, straight-line3km/max4 nearby and one complete withdrawal-ID snapshot. Public reads never authorize through Identity or fetch provider media. They inspect current published16locale/version/approval/schema consistency in read-only snapshot transactions. Signed HMAC cursor binds filters/digest/lastID/expiry and rejects mixed generations. Restored but not republished historical POIs remain withdrawn. Unknown locale never silently falls back to English. No working draft/staff fields in public payload.

New optional CONTENT_PUBLIC_CURSOR_KEY_B64URL is validated separately and must differ from the Content Identity credential. No real key was created/configured. Missing key leaves existing admin available and public503. Catalog/schema/index/lockfile/dependency unchanged. Prototype scans refuse>1000parents or>8MiB projected/final data; no scalability or actual50-user performance claim. Overall readiness503 remains truthful.

## Actual checks —123 unique passed groups; no skips

-17 lifecycle/public Mongo+HTTP integration groups, final exit0,14.868s. Actual Content/Identity HTTP and local replica set. Public16locale fixtures inserted synthetically; no actual translations/narrations/provider assets. Publication/delete race uses actual publication transaction with explicitly synthetic trusted media/registry verifiers, not real provider acceptance.
-61 unit/relevant regression groups exit0,13.130s:5lifecycle/public +4publication +8media +4draft +6durability +7Content schema +7Identity schema +5authorization +15runtime-health. Earlier separate5unit run overlaps and is counted once.
-14 draft integration groups exit0,5.590s. Updated only the approved additive admin mutationVersion assertion (now2 after clone/save); preserved original conflict/invalidation/rollback fixtures.
-16 publication integration groups exit0,29.483s, actual Mongo/Identity/provider-loopback adapter. No weakened TASK013 assertions.
-15 media integration groups exit0,14.798s, actual binary probe/local HTTP provider fixture. Sampled parent RSS214642688bytes includes fixtures and tests, not an isolated Render memory/capacity measurement.
- Full workspace build exit0; final Content build exit0 after historical-source restore guard. Runtime health regressions cover truthful503/no-store and independent service listeners.

Coverage includes anonymous exact payload/no Identity dependency, no draft/locale leakage, fresh Staff-vs-Manager/session/lock authority, same-key replay/different-key conflicts, restore clone and working draft/in_review branches, reset approvals/current-pointer clearing, persistent withdrawal until synthetic republish, literal regex metacharacter search, cursor signature/filter/expiry/digest restart,0/1/4nearby/ties/exact3km/outside, no coordinate persistence, outbox rollback, corrupt/missing recovery source/overflow/ambiguous quarantine, missing key/admin availability/read-only catalog, real parent delete-vs-save and delete-vs-publication races, coherent snapshot across concurrent delete,1000POI fail-closed scan and8MiB rejection without partial page.8MiB fixtures use bounded synthetic bulk-inserted data and clean their exact fixture IDs afterward; no production writes.

## Iterations and manual review

Initial11group integration passed; expanded15group passed; final17group passed. These are overlapping sets, not additional count. No failed test run was suppressed or counted as pass in this task. Unit review caught Zod default bypassing numeric conversion; used prefault before first test run so default limit is numeric. Manual review added invalid live-pointer failure in withdrawal reads, and validation of retained historical English even when restore reuses an existing working draft; final tests cover these paths. Existing prior-task failures remain documented in their own evidence, not attributed to TASK014.

## Fixture isolation and cleanup

All DB tests require exact name prefix/task label, pinned image mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907,127.0.0.1binding, expected replica set and initially empty owned databases. They do not accept an arbitrary real URI. Schema/index provisioning in tests occurs only after those guards.

TASK014 fixtures:
- vinlook-task014-mongo-lifecycle:b9ebbbded3f52a715089664e9138041d697ef195cf76552155e81d1511d9f048
- vinlook-task014-mongo-acceptance:6321fe770f051621119d1fad704b426aab5d9fa95959379b5cadbb37a675e415
- vinlook-task014-mongo-final:1b0b7ca49f61cc6e4b88c80a3d02f8569ec3df5f0e44977da7afb2bbaa286ab9

Regression fixtures:
- TASK012/ vinlook-task012-mongo-lifecycle-regression:47b71343a6bbabd8605ec500bf2b8fe4171ba0db8c6913d995d395015547a331
- TASK013/ vinlook-task013-mongo-lifecycle-regression:3a1cf4ee361e39569181bb660a5cf54d5a8fd19c74a0d74f82a5934087239252
- TASK019/ vinlook-task019-mongo-lifecycle-regression:ef83bd6203da1b14f5eeb40df510fe887ee6737e9d4b29f212d905b5b1be954f

All6containers and their own volumes removed after full ID/task label and volume-only /data/db or /data/configdb mount checks. No unrelated container/volume/image/engine cleanup.

## Remaining acceptance gates

No real Atlas/provider request/upload, credentials, POI seed, deployment or settings change. No actual UI, offline-cache/player/route invalidation, automatic whole-package update or backup/disaster-recovery proof. Geographic correctness, real registry/model integration/narration quality, provider/hosting/50-user capacity, CI/CD product gates and TASK010 native human terminal acceptance remain separate. Public URL availability can change outside this DB; no per-visitor provider check or cross-provider atomicity promised. Real deployment needs a privately configured distinct cursor key and reviewed existing data/catalog. No paid fallback, auto-merge or review impersonation.
