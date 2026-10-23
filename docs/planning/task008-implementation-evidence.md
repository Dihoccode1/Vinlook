# TASK-008 implementation and actual evidence

23 October 2026. Issue [16](https://github.com/Dihoccode1/Vinlook/issues/16). Approved task owner Tú (ngoctu0405); human reviewer Duy (Dihoccode1). Contract A approved before code. Published through Duy's connector with AI assistance; no claim that AI impersonates Tú or supplies human review. Review/merge pending.

## Delivered behavior

Content-only `/api/v1/internal/audit-events` reuses scoped credentials/rotation and rejects Origin/Usage/worker/operator spoofing. Strict body/actions/safe result codes, existing actor/session ownership and occurredAt bounds are validated. Identity sets actorType and receivedAt. A delayed event may refer to a closed original session or a now-locked actor; it is not reassigned or retroactively rejected for current role. POI reference stays logical, with no cross-service database query. Content remains trusted to preserve original verified business context.

First insert201, exact normalized replay200 with original receivedAt, different content for same eventId409. Existing unique eventId handles concurrent delivery; bounded3 application attempts, no update/deletion/hash field/TTL added. Persisted receipt survives a new Identity server process and replay after a lost response.

Current-authority GET `/api/v1/work-sessions` and `/api/v1/audit-logs` enforce Staff own scope and Manager account/operator access. Strict allowlisted scalar filters, real Vietnam date bounds and default20/max100 keyset pagination. Signed cursor binds endpoint, requester/current role, normalized filters and sort tuple. It cannot grant scope, survive a role/filter/account change, or be transplanted between endpoints. Cursor HMAC derives a domain-separated key from the private rate key. Stable _id tie-break handles equal timestamps; pagination remains a live view, not a snapshot. Session queries reconcile only their authorized scope, retaining midnight closure timestamps.

## Actual checks

- **9/9** audit groups passed on real guarded Mongo/HTTP: Content-only ingestion/auth/strict fields/actions/codes/references/time bounds; delayed closed-session/locked-actor receipt; exact/conflicting replay;8concurrent duplicate deliveries yielding one201/seven200/one record; Staff own/Manager account+operator queries; foreign/nonexistent session404; signed cursor tampering/requester/role/filter/endpoint rejection; equal-time tie-break; Vietnam occurredAt day edges; invalid/duplicate/Mongo-shaped query filters; Manager scoped stale-session reconciliation; bounded insertion contention; new Node server restart/lost-response replay; safe DB-loss503.
- **58/58** regression groups passed:4auth helper,7schema,15runtime,5caller/adapter,9real Mongo session,8real Mongo authority and10real Mongo register/login groups. Current unique total **67passed groups**, no skips. Full workspace build and three-service HTTP smoke passed and closed their listeners.
- Initial combined31group run had30passes and one Identity child-start test timeout at10seconds. Running the unchanged runtime suite separately passed15/15 (Identity invalid-config child exited in2.32seconds). Cause of the initial timeout was not established; no test timeout or production code was changed to hide it. Other16unique helper/schema/adapter groups passed in the combined run.
- Docker Engine was initially stopped; first attempted container launch failed because the engine pipe did not exist. Located the existing per-user Docker Desktop, started it hidden, verified Engine29.8.2, then created the disposable containers. No Mongo pass is claimed from that failed attempt.
- Incidental latest bcrypt12 regression sample300ms hash/298ms compare; cost unchanged, not a hosted latency/load result. No dependency versions, production secrets or schema/index definitions changed.

## Isolation and reproduction

`npm run test:audit:db` only accepts `VINLOOK_TEST_MONGO_CONTAINER` matching `vinlook-task008-mongo-[A-Za-z0-9_-]+`, exact label `vinlook.task=TASK-008`, pinned image `mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907` (Mongo8.0.34), loopback published port and replica set `vinlook_task008`. It derives a fixed local URI for `vinlook_identity_task008`, requires zero collections before explicitly creating fixture indexes/accounts, and refuses caller-provided URIs/Atlas credentials. Operator alias/data is synthetic, with no real operator provisioning. Test child keys are memory/environment only, not command arguments or committed files.

Create a new matching unused container with that label/image, publish `127.0.0.1::27017`, run mongod `--replSet vinlook_task008 --bind_ip_all`, initiate one member at`127.0.0.1:27017`, wait for primary, set container-name environment variable and run the suite. Existing suites retain their own separate task/database/replica-set guards. Restricted HTTP/Docker execution needs local permissions.

Actual containers: `vinlook-task008-mongo-audit`, `vinlook-task007-mongo-audit-regression`, `vinlook-task006-mongo-audit-regression`, `vinlook-task005-mongo-audit-regression`. All four exact returned IDs, labels and volume-only `/data/db`/`/data/configdb` mounts were checked before stopping/removing those containers and their own anonymous volumes. No task test server/container remains. No other containers/volumes were stopped/deleted.

## Remaining gates

Actual Content transactional outbox/sender/POI operations are not delivered here; synthetic authenticated HTTP events test the receiver only. Operator bootstrap/account-management writers, UI, production migration/secret distribution, Atlas/Render deployment, CI/CD and performance acceptance remain separate work. No real staff, Atlas, hosted service or paid resource changed. No exactly-once/cross-service atomicity claim. Overall readiness503. Preserve Tú-owner/Duy-reviewer assignment; await actual human review/user merge before Done.
