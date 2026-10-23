# Identity persistence declarations — TASK-004

`createIdentityModels(connection)` compiles five service-owned models on an explicitly supplied Mongoose connection. Importing this module does not connect to Mongo, initialize collections or build indexes. All schemas set strict:'throw', autoCreate:false, autoIndex:false, bufferCommands:false and versionKey:false. Only StaffAccount has createdAt/updatedAt timestamps.

| Model | Collection | Explicit indexes |
|---|---|---|
| StaffAccount | staff_accounts | unique(email) |
| WorkSession | work_sessions | unique(staffId,workDateVN) |
| AuditLog | audit_logs | unique(eventId); workSessionId/occurredAt; actorId/occurredAt |
| RecoveryCode | recovery_codes | staffId/expiresAt; no TTL |
| AuthRateLimit | auth_rate_limits | unique(key,windowStart); expiresAt TTL0 |

Account email is trimmed/lowercased. bcrypt cost12 format is checked, not proof that a password was correctly hashed. Synthetic fixture hashes do not represent real credentials. All fixtures use example.invalid identities and synthetic IDs/content.

Schema document validation enforces the approved bounds, states, exclusive account/operator actor and issuer, closed-session timestamps and strict result structure. Default query projections and JSON/object serialization suppress passwordHash/codeHash/rate key. Explicit secret projections and raw/lean operations still need caller discipline. Never expose original validation/duplicate errors: `safeIdentityError` returns only known field names and a stable code.

## Limits the API must enforce

Unique constraints require actual indexes: `unique` is not a Mongoose validator. Tests explicitly build them only on a fresh task-owned Mongo database. Production connection/index migration is not implemented here.

Do not rely on document middleware or cross-field validators for arbitrary updateOne/findOneAndUpdate/bulkWrite/direct collection operations. Those paths can bypass document hooks, and query validators do not have a loaded document's state. Each later operation must validate its allowlist and whole candidate state or enforce equivalent conditional updates/transactions. No generic write/update API is supplied.

Recovery expiry/15minute issuance/atomic one-use/invalidation, session reopening/Vietnam-day checks, account state/authVersion transitions, audit retention/allowed action mapping and safe operator verification remain API/runbook responsibilities. Schema declarations do not implement them. TTL only cleans expired rate records; it is not timely authorization enforcement. Audit/result strings must not receive raw exception text or secrets.

## Verification commands

From the repository root: `npm run test:identity` runs disconnected schema tests. `npm run test:identity:db` requires explicit VINLOOK_TEST_MONGO_CONTAINER and a fresh Docker test environment as described in docs/planning/task004-implementation-evidence.md. It refuses arbitrary URIs, containers without the task label, a different image, nonloopback publication or an existing test database. No test accepts Atlas credentials.
