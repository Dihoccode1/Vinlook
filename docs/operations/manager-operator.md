# Local Manager operator runbook

TASK-010 implementation; Duy owner, Tú reviewer. This document is not authorization to operate on a real account/database. Duy must designate the actual operator, verify target identity and approve the incident/command first. No real operator identity/credential/Manager has been provisioned by the implementation tests.

## Prerequisites

Use the pinned Node/npm runtime on the trusted operator machine. Obtain a separately authorized Identity-scoped read/write database identity and private URI for `vinlook_identity`; never use an Atlas admin, Content/Usage user or guessed app credential. The existing Identity collection/index catalog must already be provisioned and reviewed: the tool checks it, never creates/repairs it. No production provisioning/migration is supplied here.

Configure only the private local operator environment: NODE_ENV, IDENTITY_OPERATOR_MONGODB_URI, IDENTITY_OPERATOR_ALIAS and IDENTITY_OPERATOR_KEY_SHA256 per [approved contract](../planning/task010-operator-contract.md). The verifier is SHA256 of decoded32random bytes; the operator holds the independently generated base64url key. Do not reuse JWT/service/worker keys. Rotate by replacing the verifier and distributing the new key privately. Do not paste key/URI/password/code into chat, argv, source, frontend, Docker image, backup or a terminal recording. Do not deploy operator credentials to hosted HTTP services.

The credential guard does not defeat someone already controlling the trusted host/database credentials. The alias is an audit label, not proof of real-world identity. Human verification and database/host access control remain prerequisites.

## Commands

From repository root, help needs no config and makes no DB request:

```powershell
npm run operator --workspace=@vinlook/identity -- --help
```

Default authenticated dry-run: choose one approved command, enter the key at its hidden interactive prompt, then verified target/reason (and fullName for bootstrap). No password is requested, code generated or data/audit written during dry-run.

```powershell
npm run operator --workspace=@vinlook/identity -- bootstrap-manager
npm run operator --workspace=@vinlook/identity -- recover-manager
npm run operator --workspace=@vinlook/identity -- unlock-manager
```

Use only the command approved for this incident. Inspect the redacted plan's mode/alias/normalized target/reason. After Duy approves the real operation, rerun that same command with `--apply`, then type the exact normalized target email at the confirmation prompt. Bootstrap additionally requires hidden password/confirmation with15Unicode codepoints minimum/72UTF8bytes maximum/bcrypt12; whitespace is preserved. Never supply secrets as arguments or redirected stdin. Cancelling restores terminal raw mode and makes no intended mutation; a lost connection/output after commit still needs reconciliation, not blind replay.

Bootstrap creates a new active Manager only if no Manager/email/retained bootstrap audit exists. It never promotes an existing Staff. The fixed `operator:manager-bootstrap:v1` audit ID atomically prevents concurrent bootstraps; never delete that audit/account history to rerun setup. Successful output is account ID/status, not password/hash/token.

Recovery targets an existing active/locked Manager, revokes previous JWT versions and expires older unused codes atomically. The code is displayed once after commit, with15minute expiry; store/deliver it only through the approved private verification channel, not logs/files/recordings. There is no plaintext requery. If output/delivery is lost, investigate status/audit and explicitly approve reissuance; new issuance invalidates the earlier code. Manager consumes it through existing reset, which never unlocks/logs in/opens a session.

Unlock is a separate explicit command for a locked Manager. It activates that Manager, increments authVersion and audits the operator/reason. It never changes role/email/password or creates a recovery code. An active Manager cannot be unlocked again as a silent success. No arbitrary account editor, public operator endpoint or permanent backdoor exists.

## Outcomes and failures

Normal success is emitted only after business and operator audit transaction commits. A failed known-target transaction attempts a safe separate failure audit; stderr identifies recorded/unconfirmed/not_applicable without raw exceptions. DB failure/unknown commit cannot promise that failure auditing succeeded. On an uncertain commit or lost output, do not retry blindly: inspect scoped history/state through approved access first, then obtain the incident decision. A committed recovery code cannot be recovered from its stored hash.

Unknown flags, bad key/config, non-TTY input, bad confirmation/password or unmet target/state preconditions fail closed. The tool refuses missing/mismatched catalog, never silently migrates it. Failed dry-run performs no audit write. No scheduled process, listener, provider or email/SMS is started.

## Evidence and acceptance

See [implementation evidence](../planning/task010-implementation-evidence.md). Automation uses synthetic prompt/output injection, simulated TTY streams, actual no-config CLI help/non-TTY rejection and real disposable Mongo. Human interactive terminal acceptance is still pending; do not call injected prompts a human terminal test. Production identity verification, credential distribution, actual target approval, Atlas setup and hosted release remain separate gates.
