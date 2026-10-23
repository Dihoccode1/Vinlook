# TASK-005 implementation and actual evidence

Date: 23 October 2026. Owner Duy; reviewer Tú. Issue [10](https://github.com/Dihoccode1/Vinlook/issues/10). Contract A was approved before implementation; human code review/merge is still pending.

## Delivered behavior

Identity serves strict `/api/v1/auth/register` and `/api/v1/auth/login` with safe UUID envelopes and no-store responses. Signup normalizes name/email, preserves password bytes, enforces15 Unicode codepoints/72 UTF8 bytes plus exact confirmation, hashes with official bcrypt6.0.0 cost12, and always creates pending Staff. Only active credentials obtain a jose6.2.13 HS256 token with exact7200second lifetime and approved namespace/claims. Unknown accounts use a nonaccount dummy bcrypt12 comparison. Pending/locked/wrong/unknown share generic401; duplicate registration409.

Separate backend-only secret config validates canonical distinct keys, Identity database, exact origins and explicit proxy CIDRs before connecting. Mongoose connects with automatic creation/indexing disabled and3second server-selection timeout. A read-only collection/index gate rejects missing or mismatched definitions before binding; it never repairs them. Fresh production database provisioning remains a later migration/deployment task.

Mongo counters use HMAC keys, UTC fixed windows, unique key/window, conditional atomic increments and at most3 insertion-race retries. Login IP30/15minutes, registration IP5/hour, account5failed logins/15minutes. Malformed/invalid bodies consume IP capacity before parsing/validation; success does not clear failures. No raw IP/email is stored in rate records, account state is unchanged, and no in-memory fallback grants access on DB failure. Exact-origin CORS rejects other origins; empty proxy trust ignores forged forwarding headers.

## Checks actually run

- `npm run test:auth`: **4/4** groups passed: secret/config/proxy rejection and redaction; JWT lifetime/claim/namespace/algorithm/signature/expiry rejection; HMAC/window separation; bounded duplicate-insert retries.
- `npm run test:auth:db`: **10/10** groups passed on a fresh guarded Mongo8.0.34 replica set. Real HTTP and bcrypt cover Unicode/password preservation, confirmation/role injection/byte bounds, duplicate/pending/locked/unknown/active login, safe responses, malformed400/oversized413/semantic422, CORS, forged forwarding, fixed budgets, expiry and503 after DB closure.
- Concurrent wrong-password HTTP requests produced exactly **5×401 and3×429**. Concurrent direct claims on the actual Mongo IP counter admitted exactly **30of40**, with the rest rate-rejected. An exhausted registration budget remained429 when a **new Node Identity server process** connected to the same database. A later fixed window admitted requests again; TTL cleanup was not used as permission.
- Missing/wrong unique email index was rejected and left unrepaired; only guarded test setup restored the fixture index. Missing database catalog also failed without creating collections.
- Final local single-sample bcrypt12 measurement: **hash203ms, compare202ms**. Earlier sample204/206ms. These are local samples, not percentiles or hosted50-user acceptance.
- Regression: **7/7** schema groups and **15/15** runtime groups passed, full workspace build passed, three-service HTTP smoke passed and closed its listeners. Total current suites:36passed groups. Prior TASK-004 five-group Mongo evidence remains separate; models were unchanged here.
- Initial restricted-shell runtime/smoke fetch failed with loopbackEACCES. Authorized execution outside that restriction passed. No application fix or false pass attributed to that sandbox failure.
- Exact dependency install succeeded, npm reported zero vulnerabilities at install time. No claim of a complete security audit follows from that result.

## Isolation and reproduction

Use Node24.18.1/npm11.16.0 and Docker. Create a **new** task-only container with an unused name matching `vinlook-task005-mongo-[A-Za-z0-9_-]+`, label `vinlook.task=TASK-005`, pinned image `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907`, and publish `127.0.0.1::27017`. Run mongod with `--replSet vinlook_task005 --bind_ip_all`; initiate one member `127.0.0.1:27017` and wait for primary. Set `VINLOOK_TEST_MONGO_CONTAINER` to that name, then run `npm run test:auth:db`.

The suite inspects container label/image/binding, derives only a loopback URI for hardcoded `vinlook_identity_task005`, requires zero existing collections and verifies replica-set name. It never accepts a caller-supplied Mongo URI. Only this guarded fixture setup builds indexes and creates active Staff. Synthetic secrets exist in memory/child environment, not committed files or command arguments; no real user/Atlas connection is made. Tests use an injected clock for window edges and a fresh child server process for persistence.

Two containers actually used: `vinlook-task005-mongo-auth` for initial checks and `vinlook-task005-mongo-final` for final process-restart checks. After verifying their exact returned IDs, TASK-005 labels and volume-only `/data/db`/`/data/configdb` mounts, both were stopped and removed with their own anonymous volumes. No test Mongo/container/server remains; unrelated Docker resources were untouched. Reproduction requires another fresh container, not reuse of a previous test DB.

## Remaining gates

No frontend auth UI, Manager bootstrap/approval API, recovery, current DB authority/RBAC, cross-service authorization, production migration, Atlas credential integration, Render proxy verification, Docker product deployment or CI/CD is delivered here. Cryptographic token validity is not business authorization; TASK-006 must implement current status/authVersion checks. Readiness remains503 until remaining gates are implemented. No paid service or production mutation occurred. Await Tú review and user merge; passing tests alone does not mark the task Done.
