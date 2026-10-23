# TASK-006 actual implementation evidence

23 October 2026. Owner Duy; human reviewer Tú. Issue [12](https://github.com/Dihoccode1/Vinlook/issues/12). Contract A explicitly approved before code. Review and merge remain pending.

## Delivered

Identity `/api/v1/me` and `/api/v1/internal/authorize` verify existing JWT claims, read the current account, check status/authVersion and return only allowed principal/session fields. Locked/pending accounts fail403; obsolete token versions/missing accounts/invalid JWT fail401. Current role comes from DB every request. Session context is read-only, verified actor + current Vietnam date + open status; old-day sessions never grant current authority. No session creation, midnight mutation or account-state API is introduced.

Internal authorization requires distinct Content/Usage32-byte credentials and mapped caller headers; a worker or staff JWT alone has no caller authority. Identity startup validates required private caller config before connecting/binding. Previous credentials have absolute UTC expiry checked per request, maximum24hours future overlap at startup. Revocation is configuration removal and receiver restart/redeployment. Safe digest comparison uses timingSafeEqual. No real keys were generated/provisioned outside fixture memory.

Content and Usage independently own adapters with separate private configuration; they do not import Identity runtime or Mongo. Each forwards a user token under its own credential, validates strict bounded responses, enforces server-declared roles/session policies and fails closed on errors. Total deadline3000ms includes response-body reads; redirects/retries/positive authority cache are absent. No actual downstream business route exists yet: integration routes are test-only fixtures, and later feature tasks must wire the adapters into their real routes.

## Executed checks

- **5/5** caller/config/adapter groups: distinct keys, required/current/previous pairs, bounded expiry, safe URL policies; both adapter units reject redirects, invalid/oversized bodies, dependency errors and connection failures. Safe403 propagation checked. Header timeout and partially delivered body timeout both rejected around the3second deadline. Repeated requests contact Identity again; no automatic retries or positive cache.
- **8/8** real Mongo/HTTP authorization groups on a fresh isolated replica set: safe `/me`/internal fields; strict payloads400/413/422; malformed/expired/wrong-algorithm/missing-account tokens; authVersion invalidation; current lock/pending/role changes; current/closed/old-day sessions; Vietnam midnight at17:00UTC; scoped keys/cross-caller/worker/Origin denial; old-key exact expiry and removal in a newly initialized receiver; both real service adapters enforce role/session/current-account changes; DB closure fails503.
- **36/36** regression groups passed:4JWT/config/rate-helper,7model/schema,15runtime/health and10TASK-005 real Mongo auth groups. TASK-005 child-process fixtures were adjusted only to supply the newly required synthetic caller keys. Its durable rate limit/new-process tests still pass. Combined current total: **49passed groups**, no skipped tests.
- Full workspace build and three-service HTTP smoke passed. Smoke closes all listeners and makes no provider/DB calls. No dependency versions changed. Prior TASK-004 index/transaction evidence remains separate; model definitions unchanged.
- Latest regression's incidental single bcrypt12 sample:347ms hash/387ms compare under local concurrent workload, compared with TASK-005203/202ms. Cost unchanged; neither is a hosted percentile/load acceptance result.

## Guarded isolation and reproduction

The new DB suite accepts only `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task006-mongo-[A-Za-z0-9_-]+`. It inspects exact label `vinlook.task=TASK-006`, pinned image `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback-only published port and replica-set name `vinlook_task006`. It derives its own loopback URI for `vinlook_identity_task006`, requires zero existing collections, then explicitly creates only fixture collections/indexes. No arbitrary URI, Atlas/user-supplied credential or reused DB is accepted.

To reproduce, create a new uniquely named container with that label/image, publish `127.0.0.1::27017`, run mongod `--replSet vinlook_task006 --bind_ip_all`, initiate a single member at`127.0.0.1:27017` and wait for primary. Set the container name in the environment; run `npm run test:authorization:db`. Run `npm run test:authorization` for the independent local adapter/config tests. HTTP tests need permission to connect to local listeners in restricted execution environments. Synthetic fixture state/version/role/session writes prove enforcement without implementing production mutation APIs.

Actual containers in this turn: `vinlook-task006-mongo-auth` initial7group run; `vinlook-task006-mongo-final` final8group run; `vinlook-task005-mongo-regression` legacy10group regression using its separate TASK-005 guard/replica set. Exact returned IDs, labels and anonymous-volume-only `/data/db`/`/data/configdb` mounts were checked before stopping/removing these three containers and their own volumes. No task container/listener remains; unrelated Docker resources untouched.

## Remaining gates

No Manager/bootstrap/approval/lock/reset production endpoints, session lifecycle, audit delivery, frontend auth UI, production migration/secret distribution, Atlas/Render integration or CI/CD is delivered here. No production account or paid service changed. Already-authorized in-flight operations are not cancelled by a later lock. Readiness stays503. Await Tú human code review/user merge; local tests are not hosted/end-to-end product acceptance.
