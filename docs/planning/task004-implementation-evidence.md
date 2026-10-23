# TASK-004 — Actual model/index evidence

Date:23October2026. Issue: https://github.com/Dihoccode1/Vinlook/issues/8 . Schema contract A approved DEC-122. Independent human review/merge pending.

## Delivered

Mongoose9.11.3 model factory, explicit collections/indexes, document constraints, default hash/key projections and serialization suppression, safe error summaries and synthetic fixtures. Identity catalog updated with approved targetAccountId/reason and typed result details. Server startup does not connect to Mongo and readiness remains503.

## Actual checks

-7disconnected schema test groups passed, including unknown/plaintext field rejection, Unicode name bounds, normalized email, bcrypt cost12 format, dates/state consistency, conditional actor/issuer, typed results, integer/hash constraints and redacted errors.
-5real Mongo test groups passed: concurrent normalized email dedup, staff/day uniqueness, audit event dedup and secret projections, rate window uniqueness/TTL index inspection, cross-collection transaction abort rollback.
-15existing runtime/health tests passed after model installation. Frontend build, Identity model/other backend syntax and three-listener scaffold smoke passed.
-npm install reported0audit vulnerabilities at check time. No additional provider calls or real credentials used.

Test engine Mongo8.0.34 from official `mongo` image, pinned digest `sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907`. Docker29.8.2. Created one task-owned container with label vinlook.task=TASK-004 and an OS-assigned host port bound only127.0.0.1. Initiated replica set vinlook_task004. The test verified label/digest/loopback binding and an empty vinlook_identity_task004 database before creating five collections/indexes. No Atlas or other existing container was used or changed.

After successful tests, the exact task container ID/label/mounts were verified; only that disposable container and its anonymous Mongo volumes were stopped/removed. The downloaded image was retained. No shared image/volume/database cleanup was performed.

## Reproduce in a fresh disposable container

Use a unique test-owned name matching vinlook-task004-mongo-*; do not reuse a nonempty database. Example PowerShell commands (no credentials required):

```powershell
docker run -d --name vinlook-task004-mongo-repeat --label vinlook.task=TASK-004 --publish 127.0.0.1::27017 mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907 mongod --replSet vinlook_task004 --bind_ip_all
docker exec vinlook-task004-mongo-repeat mongosh --quiet --eval "rs.initiate({_id:'vinlook_task004',members:[{_id:0,host:'127.0.0.1:27017'}]})"
docker exec vinlook-task004-mongo-repeat mongosh --quiet --eval "const until=Date.now()+20000; while(!db.hello().isWritablePrimary && Date.now()<until){sleep(200)}; if(!db.hello().isWritablePrimary){throw new Error('Primary not ready')}"
$env:VINLOOK_TEST_MONGO_CONTAINER = 'vinlook-task004-mongo-repeat'
npm run test:identity:db
```

Confirm the exact container ID, task label and expected anonymous volume mounts before stopping/removing only this disposable resource. The integration test closes its connection, but deliberately does not delete a supplied container or database on its own.

## Acceptance limits

No registration/login/session/recovery API, actual bcrypt authentication, atomic recovery implementation, live Atlas integration or index migration was executed. No exact TTL cleanup timing claimed. The expired recovery fixture remains in Mongo intentionally, proving API expiry checks are necessary. Transaction rollback is a fixture test, not an end-to-end business transaction test. No Docker product image/Compose/CI/CD or deployment acceptance inferred from a Mongo test container.

## Final refinement

Actor/issuer checks implemented as document path validators rather than pre-validation hooks. Seven schema groups passed; all five Mongo groups rerun successfully on a second fresh task-owned container after this change. That final container/anonymous volumes were verified and removed too. No use of deprecated validateSync is required by tests or runtime. Raw/query mutation limits described above still apply.
