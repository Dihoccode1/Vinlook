# TASK025 Identity catalog preparation proposal

25 October 2026 UTC+7. Duy implements; Tú reviews, unchanged.

## Verified baseline

PR58 merged as f4cca9367542b76593ced5106de33c5f66499162. Trusted-main Backend checks run40170406402 succeeded. The P1 correction is on main. Formal PR58 review list is empty; human review recorded from user confirmation.

Render public-repository form supports Vinlook without granting GitHub access. Prepared, not submitted: vinlook-identity, Docker, main, Singapore, Free0/month0.1CPU512MB, repository-root context, services/identity/Dockerfile, health /health/live, auto-deploy Off (selected option verified). No env secrets entered, service created or deployment started.

Identity actual CMD requires URI, four distinct keys, HTTPS allowed origins and pre-existing exact catalog. Unlike Content scaffold, an empty Identity configuration cannot start. Existing production model imports never create collections/indexes. No approved live provisioning command exists; test-only fixtures refuse Atlas.

## A — dedicated catalog utility (recommended)

Implement a separate Identity-only CLI without new dependencies. Derive declarations from existing approved models; no schema/index changes. Plan is default and writes nothing. Operator supplies URI privately with hidden input (never argv/logs); reject any DB other than vinlook_identity. Bound connection timeouts and always close connections; sanitized error codes only. No reading account content or secret documents.

Scope exactly five model-owned collections: staff_accounts, work_sessions, audit_logs, recovery_codes, auth_rate_limits. Eight explicitly declared indexes plus Mongo default _id indexes. Reuse verifyIdentityIndexes for the final read-only check.

--apply additionally requires typing exact database name and creates only missing ordinary collections/indexes. Do not drop, rename, syncIndexes, alter validators, change access/network rules, seed accounts, bootstrap Manager or repair conflicting/extra indexes. Inspect all targeted catalog entries before writing; any conflict stops the whole apply before writes. Ignore unrelated collections without mutating them. A partial apply failure is reported as incomplete; no rollback deletes; a later plan shows remaining work. Existing data remain untouched; unique-index build errors stop safely.

Isolated verification only in this implementation: default plan makes no writes; wrong DB rejected; conflicts block changes; fresh catalog passes exact verifier; rerun is a no-op; interrupted partial catalog can be inspected; safe output excludes URI/key/provider error values. Use disposable Docker replica set and fake secrets. No Atlas connection or writes authorized by this utility implementation approval.

After review/merge: separate concrete authorization for read-only live preflight and, based on that report, exact Atlas apply. User enters private credentials directly to the intended local CLI/Render fields, not chat. Actual service creation and deploy follow valid catalog/config and reviewed main CI.

## B — manual Atlas UI

Create the five collections and eight declared indexes manually using the same model definitions, then run read-only verification. Avoids adding CLI but requires more manual operations, makes index-option mistakes easier, and still requires explicit authorization for each live catalog change. Do not use isolated-test commands against Atlas.

## Decision

Choose A (implement/test isolated CLI then Tú review) or B (prepare manual Atlas steps). Both preserve the approved schemas and leave real DB writes, secret entry and Render deployment for their concrete setup gate. Master Prompt Rule1 requires asking before choosing the new database/deployment mechanism. TASK025 remains open0/80finalpairs.

## Approval recorded

25 October 2026 UTC+7: user selects A — implement and test plan/apply utility on disposable Mongo; Tú reviews. This does not authorize an Atlas connection or live writes.
