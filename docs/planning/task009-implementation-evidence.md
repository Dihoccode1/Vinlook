# TASK-009 implementation and actual evidence

23 October 2026. Issue [18](https://github.com/Dihoccode1/Vinlook/issues/18). Owner Duy; reviewer Tú. Contract A explicitly approved before code, including immediate JWT invalidation on lock/code issuance and reset IP budget. Human review/merge pending.

## Delivered

Manager-only Staff listing with scoped signed cursor, pending approval, active lock, locked unlock, and verified-reason recovery issuance. Target role must be Staff; no Manager/self override, role elevation or account deletion. State commands enforce expected source status and atomically audit successful changes. No open content session is required; local account audit has null workSessionId.

Lock and code issuance each increase authVersion. Unlock does not revive old JWTs. Issuance serializes on the account version write, expires prior unused codes without deleting history, stores SHA256 of decoded32random bytes and returns the canonical raw code once after commit.15minute expiry, no plaintext retrieval/replay endpoint. Actual human verification/delivery remains Manager responsibility, not a claim inferred from the reason field.

Public reset validates existing bcrypt12/Unicode/byte/confirmation rules, checks eligible code then rechecks expiry/status after hashing inside its transaction. Password/hash change, one-use consumption, version increment, other-code expiry and local audit commit together. It never unlocks, auto-logs in or opens sessions. Operator-issued Manager-code consumption is tested by synthetic fixture; no real operator tool/Manager provisioning is added.

Reset uses Mongo HMAC fixed windows:30IP requests and5account failed attempts per15minutes. IP claims precede parsing; valid-input failures consume atomic account failure capacity, success does not clear failures, DB failure grants no fallback. Wrong/noncanonical/unknown/noneligible/expired/reused/replaced codes share generic401 unless exhausted429. Existing proxy trust/deployment gate retained. Strict16KiB requests, safe UUID/no-store/CORS and bounded transactions; uncertain commits are not replayed as new resets.

## Executed checks

- Initial **9/9** Staff groups passed; final fresh-DB **10/10** groups passed after adding expiry-at-consumption and safe-integer-bound checks. Count final groups once, not both runs.
- Real HTTP/Mongo covered Manager/Staff/missing-token/Manager-target gates; safe signed listing/cursor binding; approve/stale conflict/lock/unlock; old JWT rejection after unlock, issuance and reset;32byte code/hash/expiry/replacement; actual bcrypt12 Unicode preservation and confirmation/72byte rejection; one-use and locked reset without unlock/session creation; concurrent issuance leaving one active code; two simultaneous resets yielding one200/one401/one audit; rollback of lifecycle/issuance/reset when audit injection fails; expired/noncanonical/unknown/pending errors; operator-issued locked Manager fixture;5of8concurrent failures401/rest429, IP30 invalid inputs/forged forwarding/window rollover; new Identity process retaining exhausted reset budget; DB503; authVersion overflow prevention.
- The consumption-time expiry test passes a clock that advances only after precheck/hash begins; code remains unused and password unchanged when the transactional expiry check fails. It is an actual Mongo transaction check, not only a schema declaration.
- **67/67** regressions passed:4auth helper,7model/schema,15runtime,5caller/adapter,9real Mongo sessions,9real Mongo audit/history,8real Mongo authority and10real Mongo register/login groups. Combined current unique total **77passed groups**, no skipped groups. Helper/runtime tests ran with test concurrency1 to reduce unrelated startup resource contention; no timeout threshold changes.
- Full workspace build and three-service HTTP smoke passed, all listeners closed. No dependency versions, schema/index or secret env definitions changed. Existing cursor schema gained the separately bound Staff-list endpoint.
- Latest incidental bcrypt12 regression sample329ms hash/328ms compare; cost unchanged, not hosted latency/load acceptance. No Atlas, real account, provider or paid service used.

## Guarded isolation/reproduction

`npm run test:staff:db` accepts only `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task009-mongo-[A-Za-z0-9_-]+`, exact `vinlook.task=TASK-009`, pinned image `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback published port and replica set `vinlook_task009`. It derives a hardcoded local URI for `vinlook_identity_task009`, requires a fresh empty DB, then explicitly creates only fixture collections/indexes/accounts. No caller URI/Atlas credentials accepted. Code/keys are synthetic, not printed; child secrets passed in memory/environment, never command arguments or committed config.

Create a new matching unused container, label/image above, publish `127.0.0.1::27017`; start mongod `--replSet vinlook_task009 --bind_ip_all`, initiate one member at`127.0.0.1:27017`, wait for primary, set container-name variable and run suite. Fixture clocks handle expiry/window edges; the process-restart test switches to actual wall clock before exhausting the durable counter and spawning the child. No counter seeding after child startup substitutes for persistence.

Resources actually used: `vinlook-task009-mongo-staff` initial run; `vinlook-task009-mongo-final` final10groups; `vinlook-task008-mongo-staff-regression`, `vinlook-task007-mongo-staff-regression`, `vinlook-task006-mongo-recovery-regression`, `vinlook-task005-mongo-recovery-regression`. Each regression retained its own guard/DB/replica set. All six exact returned IDs, task labels and volume-only `/data/db`/`/data/configdb` mounts were checked before stopping/removing these containers and their own anonymous volumes. No task DB/container/server remains; no unrelated container/volume stopped/deleted.

## Remaining gates

Real Manager provisioning/operator tool is TASK-010. Human verification/channel delivery, frontend screens, actual Atlas integration/migrations, public deployment, CI/CD and full product acceptance remain separate. No Manager account/recovery code was provisioned for a real person. No email/SMS automation or paid fallback. Overall readiness503. Await Tú human review/user merge; actual local checks do not establish hosted end-to-end acceptance.
