# TASK-010 implementation and actual evidence

23 October 2026. Issue [20](https://github.com/Dihoccode1/Vinlook/issues/20). Owner Duy; reviewer Tú. Contract A approved before code. Human review/merge pending. No actual operator/Manager provisioned.

## Delivered

Local CLI with only bootstrap-manager/recover-manager/unlock-manager and explicit --apply. Default authenticated dry-run checks target/catalog and outputs a redacted JSON plan without writes/hash/code generation. Separate Identity-only operator URI/verifier/alias, canonical32byte key digest verification before DB connection, fail-closed TTY secret input, exact target confirmation and existing bcrypt12 policy. No public route, role, migration, scheduler, service-key reuse or password argv/env fallback.

Bootstrap creates new active Manager and fixed namespaced bootstrap audit in one transaction. Existing Manager/email/bootstrap history blocks rebootstrap; Staff is never promoted. Existing unique audit eventId guards concurrent different-email bootstrap without a new lock/schema/index. Recovery serializes via account version, revokes JWTs, expires unused old codes, stores SHA256/15minute operator-issued code and emits plaintext once after commit. Existing reset consumes it without unlocking. Explicit unlock changes only a locked Manager to active, increments version and audits; no implicit unlock or arbitrary editor.

Safe known-target failure auditing is best-effort after rollback, with honest unconfirmed status if audit storage fails/commit is uncertain. No raw exception or secret is logged. [Runbook](../operations/manager-operator.md) retains human verification/authorization and target-specific production prerequisites.

## Actual checks and corrected failure

- **4/4** operator config/CLI/TTY groups passed: unsafe config/args/key rejection, no-connect help/bad key, simulated secret stream no echo/Unicode/backspace/cancel/raw-mode restoration, actual CLI no-config help and actual redirected-input rejection without secret disclosure.
- Initial real Mongo run had1pass/6failures. Concurrent bootstrap produced no winner, so later recovery tests lacked their prerequisite Manager. The implementation had parallel preflight queries on a transaction session. Changed them to sequential awaits, consistent with [Mongoose transaction guidance](https://mongoosejs.com/docs/transactions.html#note-about-parallelism-in-transactions). No timeout/AC was weakened; initial failure is retained here.
- Final fresh database **7/7** Mongo groups passed: dry-run/cancel/password checks no writes; actual bootstrap audit failure rollback; Staff-email refusal; concurrent different-email bootstrap exactly one Manager/audit; retained-history guard (Manager-existence read simulated absent, without deleting fixture history); operator alias/target scope; raw-once32byte hash/expiry/replacement/version and locked status; existing reset one-use integration; separate unlock/state refusal with failed audit; recovery audit-failure rollback/unconfirmed failure-audit status; concurrent issuance one active code; closed DB denial.
- **50/50** relevant regressions passed:4auth helpers,7schemas,15runtime,5caller/adapter,10real Mongo Staff/recovery and9real Mongo audit/history. Current unique passing groups **61**, no skips; do not double-count the failed first Mongo run or imply all historical suites reran. Other prior routing/provider/session/auth integration evidence remains separate.
- Final full workspace build and three-service HTTP smoke passed; all test listeners closed. No dependency/schema/index changes. New private operator-only env names have deliberately invalid example values; no real URI/key/password/code stored in source.

TTY stream handling uses the existing Node keypress API; automated stream simulation is not human interactive terminal acceptance. Actual CLI help/non-TTY rejection was executed; a person has not yet completed the native secret-entry workflow. That manual check remains pending before real operational use.

## Isolation/reproduction

`npm run test:operator` runs disconnected config/stream/CLI checks. `npm run test:operator:db` only accepts `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task010-mongo-[A-Za-z0-9_-]+`, exact label `vinlook.task=TASK-010`, pinned image `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback published port and replica set `vinlook_task010`. It derives its own fixed local URI for `vinlook_identity_task010`, requires an empty DB and explicitly builds fixtures. Missing catalog is tested to fail without collection creation. No caller URI/Atlas/operator credential accepted.

Create a fresh unused matching container with the above label/image, publish `127.0.0.1::27017`, run mongod `--replSet vinlook_task010 --bind_ip_all`, initiate a single member at`127.0.0.1:27017`, wait for primary, set container-name variable and run suite. Prompt/output injection is inside tests only, not a CLI bypass flag. Synthetic key/alias/password/Manager data is private to fixture memory; no real person verified or account created.

Actual containers: `vinlook-task010-mongo-operator` failed initial run, `vinlook-task010-mongo-final` corrected run, `vinlook-task009-mongo-operator-regression`, `vinlook-task008-mongo-operator-regression`. Each exact returned ID, task label and anonymous-volume-only `/data/db`/`/data/configdb` mount was checked before stopping/removing these four containers and own volumes. No task DB/container/server remains; no other container/volume stopped/deleted.

## Remaining gates

Human terminal acceptance, actual operator designation/verification, separate scoped operational database identity/secret distribution, catalog provisioning, real Manager target authorization and production execution remain separate. No Atlas/real Manager/paid provider or hosted release changed. UI/complete product CI/CD/deployment remain tracked later work. Readiness503. Await Tú human code review/user merge; local fixtures are not operational or hosted acceptance.
