# TASK-007 implementation and actual evidence

23 October 2026. Owner Duy; human reviewer Tú. Issue [14](https://github.com/Dihoccode1/Vinlook/issues/14). Contract A explicitly approved before implementation. Review/merge pending.

## Delivered behavior

Active Staff/Manager explicitly opens their own session through `/api/v1/work-sessions/open`. One record/account/Vietnam day is enforced by existing unique index. Existing open returns unchanged; same-day closed reopens the same ID with original openedAt and null closedAt. No client owner/date/status accepted. First create201, subsequent open/reopen200.

Owner-only `/api/v1/work-sessions/:id/close` accepts a strict trimmed reason, closes with server time and inserts one `work_session.close` AuditLog event in the same Identity transaction. Repeated close while closed returns unchanged200 without replacing reason/time or adding an event. Manager cannot override ownership. Wrong/missing owned session uses generic404; historical close409 after reconciliation. Existing schema/indexes retained; no new closeReason field/collection.

Logical expiry is next00:00 Vietnam (17:00UTC on the workDateVN). Startup reconciles persisted prior-day open sessions before binding. Authenticated principal/session access reconciles only the verified account, after current status/version checks. Materialized closedAt is the actual midnight boundary rather than delayed processing time. While the host sleeps, writes can lag but prior-day sessions cannot authorize current work. No scheduler/poll/keep-alive or new hosted service added. This explicitly approved behavior extends TASK-006's former read-only session lookup.

Day is checked again inside each mutation transaction. Three bounded application attempts handle known aborted contention; unknown commit result is not replayed as a fresh mutation. No cancellation guarantee for already-admitted operations. Safe UUID/no-store/CORS/strict16KiB input and existing authority/error handling retained. Full history/audit query and ingestion remain TASK-008.

## Checks actually run

- **9/9** session groups passed on real isolated Mongo/HTTP: create/retry/close/reopen ID and openedAt preservation; atomic reason/audit and no duplicate on retry;8concurrent opens returning one ID/one201;8concurrent closes returning200 with one event; ownership and Manager nonoverride; strict body/ID/reason/byte limits, auth/CORS; injected audit-write failure causing actual transaction rollback; exact midnight and next-day ID; crossing midnight before write guard aborts; bounded conflict attempts and uncertain-commit no replay; new Node process reconciling persisted stale data before accepting HTTP; DB-loss503.
- **49/49** regressions passed:4auth helper,7model/schema,15runtime,5caller/adapter,8real Mongo authorization and10real Mongo registration/login groups. Combined current total **58passed groups**, no skips. Authorization fixture expectation changed from leaving old session open to exact approved midnight closure; authority/role/version/credential/adapter behavior remains tested.
- Full workspace build and three-service HTTP smoke passed. All smoke/test listeners closed. No dependency versions, secret env names, schema or index definitions changed.
- Latest incidental bcrypt12 local regression sample335ms hash/330ms compare. Cost unchanged; this is not hosted latency/load acceptance.

## Isolation and reproduction

New session suite only accepts `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task007-mongo-[A-Za-z0-9_-]+`, exact task label `vinlook.task=TASK-007`, pinned `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback-only published port and replica set `vinlook_task007`. It derives a hardcoded local URI to `vinlook_identity_task007`, requires zero existing collections, and creates only fixture collections/indexes/accounts. No arbitrary URI/Atlas/user credential is accepted.

Create a new unused matching container name, label/image above, publish `127.0.0.1::27017`; start mongod with `--replSet vinlook_task007 --bind_ip_all`, initiate one member at`127.0.0.1:27017`, wait for primary. Set the container-name variable, run `npm run test:sessions:db`. The suite injects its clock for calendar edges, a synthetic audit failure for rollback, and starts a real child Identity process for restart reconciliation. All keys/accounts remain synthetic, child keys passed privately through environment rather than command arguments. HTTP/Docker checks need local execution permission in a restricted sandbox.

Actual resources used: `vinlook-task007-mongo-auth` for9session groups; `vinlook-task006-mongo-session-regression` for8current-authority groups; `vinlook-task005-mongo-session-regression` for10auth groups. Each regression suite retains its own exact task/DB/replica-set guard. After verifying the exact returned container IDs, labels and anonymous-volume-only `/data/db`/`/data/configdb` mounts, all three containers and their own volumes were stopped/removed. No task container/server remains, unrelated Docker resources untouched.

## Remaining gates

No Atlas/real-account mutation, public deployment, paid resource, UI, full audit ingestion/history queries, Manager recovery/account APIs or CI/CD delivered here. Production migrations/proxy/secret distribution still need their own approved work. Reconciliation adds only the explicitly approved session writes to startup/current-principal handling; catalog creation/repair stays disabled. Overall readiness remains503. Local fixtures are not hosted end-to-end acceptance; await Tú review and user merge before Done.
