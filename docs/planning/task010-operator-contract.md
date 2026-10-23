# TASK-010 — Local Manager operator implementation contract

23 October 2026. Issue [20](https://github.com/Dihoccode1/Vinlook/issues/20). Owner Duy; reviewer Tú. TASK-009 merged cb6ae68ef215d8da40a5c904b40d96ffd7029fbb; TASK-008 merged. Proposal A fills concrete CLI/config/concurrency choices under Master Prompt Rule1; no TASK-010 code yet.

## Existing approvals retained

Operator tool belongs to Identity, is local-only, has separate operational credentials and no public endpoint/operator RBAC account. Duy designates the actual operator and verifies each incident/target. Bootstrap only when no Manager exists, never promotes the first signup or arbitrary Staff. Recovery code is32random bytes/15minutes/SHA256-only/one use and audited with operator alias, target and reason outside work sessions. Public reset already implemented in TASK-009 consumes operator-issued Manager codes and leaves locked status unchanged. No hardcoded password, email automation, paid service or cross-service database access.

## Proposed A — Private CLI configuration and prompts

Add `services/identity/scripts/operator.js`, invoked through `npm run operator --workspace=@vinlook/identity -- <command> [--apply]`. Commands only `bootstrap-manager`, `recover-manager`, `unlock-manager`; reject unknown flags/positionals. `--help` displays no config/secrets and connects nowhere. Without `--apply`, authenticate and validate a redacted operation plan only: no account/code/audit write, password hashing or plaintext code generation. No HTTP listener or scheduler starts.

Private environment inputs:

- `NODE_ENV`: development/test/production; explicit production mode cannot be inferred from a URI. No HOST/PORT needed for CLI.
- `IDENTITY_OPERATOR_MONGODB_URI`: required Identity-only URI with explicit `vinlook_identity` database; isolated tests may use guarded `vinlook_identity_task010`. No fallback to app/Content/Usage URI or admin database. Production runbook requires a separately authorized Identity-scoped read/write operator database identity, never Atlas admin or another service's user. This task does not create it or reuse stored real app credentials.
- `IDENTITY_OPERATOR_ALIAS`: configured approved nonsecret alias matching `[A-Za-z0-9._-]{1,100}`; no automatic assignment of an actual person by this task. This alias is what audit records, not a new Staff account or password.
- `IDENTITY_OPERATOR_KEY_SHA256`: lowercase64hex SHA256 of decoded32random operator-key bytes; expected verifier private in operator environment. Operator enters the canonical base64url key through a hidden TTY prompt. Compare fixed-length SHA256 digests with timingSafeEqual. The operator key is independently generated, not a JWT/service/worker key; no other service secrets are loaded to run this tool. Rotation replaces this single configured verifier; no service-key overlap behavior is inferred.

Validate config/key before DB connection. Noninteractive secret input fails closed; no password/key/code in CLI args, shell history, logs, default env examples or files. Prompts collect verified target email and reason; bootstrap also collects fullName. Normalize email/name using signup bounds, reason trimmed1–500UTF16 units/codepoints. Only apply mode asks hidden bootstrap password and exact hidden confirmation with existing15codepoint/72byte bcrypt12 policy. No password/code is read from environment, argv or unmasked fallback.

Connect with autoCreate/autoIndex/buffering disabled and3second server-selection timeout; require the approved Identity catalog unchanged. The tool does not provision collections/indexes or silently run migrations. Its DB-scoped operator credential plus trusted host/operator authority is the actual write boundary; local key/config guards do not protect against someone who already controls that host and database credentials. No security claim that the program can prove human identity verification from a flag/reason.

Before an apply, show only command/mode/alias/normalized target/reason (JSON-escaped, no URI/key/hash/password/code), require the operator to type that exact target email as confirmation, and then recheck preconditions in the transaction. Duy's authorization of a real target is still a runbook prerequisite; implementation approval here is not authorization to run on Atlas or a real person.

## Proposed A — Bootstrap and concurrent safety

`bootstrap-manager` creates a **new** verified active Manager, authVersion0 and bcrypt12 password. Reject if any Manager exists (regardless of status), target normalized email already exists (including Staff), or bootstrap history already exists. Never edit/promote/replace an existing account. Show created account ID only after commit, never its hash/password/token.

Use existing AuditLog unique eventId as a one-time concurrency guard: successful bootstrap event has fixed nonsecret local eventId `operator:manager-bootstrap:v1` and action `manager.bootstrap`. This is the actual immutable bootstrap audit, not an unrelated lock document. Remote Content accepts only UUID event IDs and cannot create this namespaced event. The transaction inserts both Manager and this event; competing bootstraps cannot commit twice, including different target emails. Retained bootstrap history also prevents rebootstrap after unauthorized physical removal of a Manager. No new field/collection/index or background lock service.

Successful audit: actorType=operator, operatorId=configured alias, actorId/workSessionId/poiId=null, targetAccountId=new Manager, reason, occurredAt=receivedAt=server time, result succeeded/errorCode=null. A conflict returns a safe nonzero exit; never claim an existing account was newly created.

## Proposed A — Recovery and separate unlock

`recover-manager` targets an existing Manager active or locked; never a Staff/pending/nonexistent target. It does not edit email/name/role/status/password. Generate32CSPRNG bytes, store SHA256 of decoded bytes, issuedBy=null/issuedByOperator=alias, expiresAt=now+15minutes, usedAt=null. In one transaction increment target authVersion once, expire all old unused codes with min(old expiry,now), insert new code and operator audit action `manager.recovery_code_issue`. Reuse TASK-009 version-write serialization and safe integer checks; concurrent issuance/reset cannot leave two current codes. No plaintext fetch/replay after lost output.

After commit show the raw code once to the interactive operator terminal with expiry and target. Never include it in audit/ordinary logs or a default output file. Operator privately delivers it only after verification. Manager uses existing reset flow; that flow does not unlock/log in. Fixture automation may inject prompt/output functions inside tests, never a production bypass flag or arbitrary URI option.

`unlock-manager` is a **separate explicit incident decision/command**, not a side effect of recovery/reset. Only an existing locked Manager may transition to active; active/noneligible targets fail without changing state. Increment authVersion once so an old copied JWT does not revive; audit `manager.unlock` atomically with target/reason/operator. Leave password/email/role/history/session records and recovery-code state unchanged. No general account editor, role switch, Manager lock/delete or public unlock endpoint.

All operations use bounded maximum3 application contention attempts and no replay of uncertain commits. Audit and business writes are atomic; failures never leave a success record or partially created Manager/code/state change. For authenticated operations with a known verified target, record a separate safe failed-result audit best-effort after rollback (static `OPERATOR_OPERATION_FAILED`, no rejected values/exception text). Invalid credential/preflight with no verified target does not fabricate an actor/target audit. If DB/audit storage is unavailable, exit safely and report that failure auditing could not be confirmed; never promise a durable record without a successful write.

## Evidence and scope

Guarded fresh TASK-010 loopback Mongo replica set with synthetic aliases, keys, targets and injected prompt/output functions. Test no-DB help/invalid-config/key/nonTTY rejection, dry-run no writes, password/confirmation policy, existing Manager/Staff-email refusal, concurrent different-email bootstrap one winner, atomic audit rollback, operator alias/target scope, recovery hash/expiry/replacement/revocation/one-use existing reset integration, locked reset with no implicit unlock, explicit unlock and invalid states, safe failures and output redaction. Existing relevant auth/Staff/audit regressions/build/smoke remain green. Human interactive terminal acceptance must be distinguished from injected-prompt automated evidence.

No real Manager account, operational DB identity, operator secret or code will be created or configured by this implementation task. Actual operator/target/credential setup is separately authorized by Duy when needed. No production execution, Atlas provisioning, hosted deploy, paid service, frontend UI or CI/CD change. Readiness stays503. Draft PR after actual checks; Tú reviews and user merges.

## Decision

Approve A together: separate private operator config/hidden TTY/default dry-run, explicit apply/target confirmation, fixed bootstrap-audit race guard, recovery version/expiry transaction and **separate unlock-manager command**, plus honest failure-audit limits; or specify changes. These details were absent from the high-level runbook and need approval under Master Prompt Rule1. TASK-009 review/merge is complete; no repeat approval or private key in chat is requested.

Approval: Duy explicitly approved A (implement and test),23October2026. Proposal wording retained as history.
