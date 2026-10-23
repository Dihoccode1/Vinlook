# TASK-015 — implementation and actual evidence

23 October2026. Actual Issue25. Owner Duy, human reviewer Tú. Contract A and TASK015-before012 ordering explicitly approved. Review/merge pending.

## Delivered

Two strict Content-owned model factories, canonical request hashing, atomic internal mutation/outbox/minimal replay executor,24h replay and durable in_progress quarantine; bounded authenticated HTTP outbox sender with explicit lifecycle, approved backoff/jitter and safe diagnostics. No new dependency/secret, Content startup DB connection or public mutation endpoint. Later API tasks must freshly authorize and validate business state; fixture callbacks are not production endpoints. See src/durability/README.md and approved task015-outbox-contract.md for integration limits.

## Confirmed final checks

-6/6 disconnected durability groups: exact strict collection/index options/no TTL, event/result/UUID/counter constraints, minimal replay state/expiry, canonical hashes/type/order/nonJSON rejection, private HTTPS config and explicit empty-poll lifecycle.
-12/12 actual Mongo/HTTP groups: real catalog; atomic mutation/event/replay; callback/outbox rollback; six concurrent same-key requests one committed result; actor scope isolation; new-connection lost-response replay and exact24h boundary; expired in_progress quarantine; actual TASK008 authenticated receiver preserving locked actor/closed original session; repeated acknowledgement one AuditLog effect;401/403/409/422/429/503/malformed/wrong-ID/oversize/redirect/real3s timeout retention;5/10/20/40/60cap+jitter; simultaneous successful acknowledgement versus stale failing sender; actual fresh Node process replay/quarantine; real commit followed by injected UnknownTransactionCommitResult; exhausted counter diagnostics without queue starvation.
-34relevant regressions (7Content schema,7Identity schema,15runtime/health,5authorization adapter groups) passed unchanged with localhost permission. Together with6durability groups this was40/40; final durability6 rerun after final canonical/diagnostic review. Final Mongo12/12 rerun on fresh DB. **52unique passing groups**, no skips; earlier9Mongo pass is not added again.
-Full workspace build exit0; final Content build exit0 after final review. Three services health/live and truthful readiness503 verified by runtime suite, all listeners closed. No claim that historical operator/provider/all Mongo suites were rerun.

## Failures retained

First integration-file write failed with Windows launcher CreateProcessW error5, so file was absent and no integration test ran on that attempt. Rewrote file successfully. First real suite0/9 due to setup hook fixture passing incomplete synthetic key config to Identity loadServiceCredentials; no application assertions passed there. Corrected only fixture to supply synthetic jwt/rate keys, then fresh DB9/9. Extended with restart/unknown-commit/exhaustion tests to12/12, reviewed code and reran final12/12 fresh. Initial regression35/40 with5localhost EACCES failures under sandbox; unchanged40/40 passed after authorized loopback access. No assertion weakened or failed run counted as success.

## Isolation and reproduction

Pinned mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907, Mongo8.0.34. Suite requires container name vinlook-task015-mongo-[A-Za-z0-9_-]+, exact task label TASK-015/image, loopback host port, replica set vinlook_task015 and zero pre-existing collections in both vinlook_content_task015/vinlook_identity_task015. Derives URI from inspected container, never accepts an arbitrary Mongo URI. Identity imports occur only in fixture tests; Content production modules never import Identity models or read its DB. Child process independently verifies label/image/loopback/replica set before replaying synthetic inputs.

Create unused matching labelled/pinned container with127.0.0.1::27017 and mongod --replSet vinlook_task015 --bind_ip_all; initiate one localhost member and wait for primary. Set VINLOOK_TEST_MONGO_CONTAINER then npm run test:durability:db. Use a fresh container/database for each suite run. npm run test:durability is disconnected. npm run build and existing test:content/test:identity/test:runtime/test:authorization commands cover regressions.

Four actual task containers were created: durability825005a102fc6118a123ff69e25567d9a1a732cf8f0c6ab02232a86358119799; final1dee0ffbf15b579f692da60d227fbf97ce0d8dfb7e209d6063d925cfdb5567bb; acceptance93ccafbd9b1e6c671beb53e9fd30482c9dec5ee1bf489313cef73ee67c4bd11d; reviewede8d81ef8524821678f37f47c0dd1262f9047ceca45145bca78cc28bd5d1c3c7a. All names prefixed vinlook-task015-mongo-. Exact IDs/task labels and only anonymous-volume /data/db,/data/configdb mounts verified before stopping/removing their own volumes. All4removed successfully; unrelated resources unchanged.

## Remaining gates

No actual Staff/current-authority HTTP mutation integrated, real business state/version callback, production bootstrap/index verification, Atlas/Manager provisioning, POI seed, provider/media/job integration, deployment or CI/CD acceptance. Document validators cannot enforce arbitrary raw writes. Callback correctness/business guards and side-effect freedom remain the responsibility of later server code, not an exposed client API. Legacy in_progress repair is fail-closed classification, not automatic evidence inference. Unknown-commit test injects the lost acknowledgement after a real commit, not an actual network partition. No exactly-once/global event order or scheduler-while-asleep claim. TASK010 native human TTY/real operational acceptance remains independently pending. Await Tú review/user merge; TASK012 starts after that and its own detailed contract approval.
