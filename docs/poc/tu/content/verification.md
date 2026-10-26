# TU03 inventory/runner/read-only HTTP verification

Refs #73, branch codex/poc-tu-03-content-data. Baseline PoC seed
`f8058292169d994ae75116b078e3103cded34018`; clean branch at start. Exact PR/head
and actual CI observations are recorded in the GitHub handoff after publication.
No AGENTS.md found; START-HERE/ownership/contracts/review instructions read.

## Executed locally — 26 October 2026 UTC+7

Pinned Node24.18.1/npm11.16.0 from the previously verified official runtime archive;
no dependency/lock/system-runtime changes. New modules use Node built-ins only.

| Check | Observed result |
| --- | --- |
| `node scripts/poc/content/cli.mjs inventory` | Generates15POIs/240rows, no live verification |
| `node scripts/poc/content/cli.mjs inventory --check` | PASS, deterministic source hashes/profiles/metadata; CRLF normalized |
| `node --test scripts/poc/content/test/cli.test.mjs scripts/poc/content/test/inventory.test.mjs scripts/poc/content/test/runner.test.mjs` | 22/22 PASS, none skipped; synthetic transport, temporary receipt files, no network/DB/provider |
| First-five narration hashes vs previous TASK025 batch plan | PASS for all5 |
| CLI private-output/exclusive-create/redaction/no-execute checks | PASS, no overwrites or network command |
| Single-scope concurrency, restart/new key after unknown outcome | One POST maximum; existing reservation refuses resend |
| Full source/locale/ID/version/model/readback and forged-request cases | Reject before mutation or stop after one returned mismatch; no inference/upload/result |
| Bounded timeout regression | Initially failed because deep-freezing AbortSignal blocked its abort transition, causing an uncaught timer error and handle warning. Fixed by freezing only the wire object with its live platform signal. The unchanged abort/unknown/no-second-POST assertions then pass; final run has no FileHandle warnings |
| `node --test scripts/poc/content/test/read-only-http.test.mjs` | 10/10 PASS; real fetch/HTTP streaming, synthetic JWT/readbacks, temporary loopback-only servers |
| Combined CLI/inventory/runner/read-only HTTP suite (four test files) | 32/32 PASS, none skipped; no real account, database, provider or deployed Content calls |
| Read-only transport controls | Fixed GET routes/IDs; second redirect server receives zero requests; no retries; bounded headers/body timeout and bytes; abort/close/single flight; redacted HTTP/transport errors; DTO/list identity checks |

`git diff --check`, staged publication-inventory/credential scan and remote blob
comparison are recorded at handoff. Do not claim CI ran these new tests unless
the workflow actually includes these `scripts/poc/content/test` paths. The seed's
existing Backend checks runs Identity/Content regression, not the new CLI/runner
suite. CI is not predicted successful in this file.

## Fixture versus live

Tests use clearly synthetic POI/job/UUIDs, example.invalid origins, source strings,
model/profile metadata from the existing registry and temporary private files.
They exercise the actual CLI, planner/orchestrator/journal code and filesystem
exclusive-create/fsync behavior; synthetic transport replaces orchestration HTTP.
The new read-only HTTP tests use real fetch and loopback HTTP servers through an
explicit test-only mapping from a synthetic HTTPS origin. No real TLS handshake,
deployed ingress or RBAC is verified; there is no production HTTP/TLS bypass. The
test cleanup checks the exact mkdtemp parent/prefix before removing only its own
temporary directory. No private operator receipts or environment were inspected.

No live login, current database state, account/session/RBAC API acceptance, data
mutation, provider metadata/generation, model/map acquisition, inference/audio,
Cloudinary upload, worker execution, image selection/license grant, new source
fact-check, fieldwork, browser/device, deploy/load/rollback or public content was
performed. No screenshot/video applies to this non-UI tooling. 0live pairs
verified by this run does not assert that the project's actual approved count is0.

## Reproduction and remaining handoff

Run the two commands in [runner.md](runner.md) with the pinned runtime; no npm
installation or cloud access needed. The read-only HTTP tests require permission
to bind temporary loopback ports in restricted sandboxes. The CLI
inventory is public metadata only. Plan inputs/outputs and receipts stay outside
all Git checkouts; no raw HTTP/credential dumps in GitHub evidence.

Global server-adapter run-next cannot target job/locale before provider dispatch;
operation=dispatch is refused. Exact Content-owned admission changes or a separately
approved global manual plan need Duy's decision, not an implicit client workaround.
No core/shared contract change, migration or consumed env variable is added.

This slice implements offline inventory, guarded orchestration and a tested
read-only HTTP library; the CLI stays offline and no live read was performed.
TU03's live dataset/human/media240pair/publish acceptance remains pending. Duy
reviews/merges into codex/poc-demo and closes the issue only after the full AC.
