# TU02 independent lifecycle/counting and health core

Refs #71; gate #70. Branch `codex/poc-tu-02-usage`, base integration
`b6f5d0e7a363bdfb6dddd6a8d6876f73ea4f3718`. Prepared 26 October 2026 (UTC+7).
Ownership: services/usage/** and this document only. Exact final head, remote file
comparison and actual CI observations are recorded in the PR/issue handoff.

Before publication the integration branch advanced with PR89/90/92. The working
branch fast-forwarded without conflict to
`811c8e40f05c18701080bebaa786543aa3607d4e`; the complete module suite was rerun on
that updated base. Other lanes' files were preserved and are not part of this PR.

## Gate found at start

Duy reopened #70 at 13:03:14 UTC / 20:03:14 UTC+7 on 26 October. Its merged
usage-contract.md still labels U1–U4 PROPOSED and explicitly gates endpoint/schema
implementation; no approval/amendment decision was found in #70 comments or PR83
review/comments at inspection. This slice implements the independent, already
approved D004/D005/D017 semantics. It does not mount new routes, declare schemas or
silently treat the merged fixture PR as U1–U4 acceptance. #71 remains open.

Usage package currently owns Express/Zod only. A Mongo driver is not declared;
Mongoose9.11.3 is already pinned by Content/Identity but cannot be borrowed as an
undeclared Usage dependency. Duy must decide dependency/catalog details and own
the shared root lock integration before the durable adapter work. This PR changes
Usage package scripts only; no dependency/root lock is edited. Local Docker client
was available but its daemon pipe was unavailable; no local Mongo test was run.

## Implemented code

`domain.js`: strict internal visitor inputs and server times; separate atomic store
port; presence/start/heartbeat/end; duplicate and identity checks before public
admission; recheck after awaiting admission; terminal end-before-start; first end
wins; no automatic write retries or retention cleanup; fresh distinct global/per-POI
counting at one cutoff. Corrupt/unknown store state fails rather than returning zero.

`health-sampler.js`: demand-driven memory samples, unknown missing bridges, parallel
3-second bounded probes, one refresh shared by callers, 30s cadence/freshness and
180s worker evidence freshness. Abort/close, clock regression, raw response/error
redaction and last-success preservation are tested. No timers run between samples,
no dependency credential/probe is loaded and no HTTP endpoint is introduced.

Store port/probe requirements and factory usage are in
[services/usage/README.md](../../../services/usage/README.md). The atomic storage
model is test-only and cannot be a runtime fallback.

## Executed evidence

Pinned Node24.18.1/npm11.16.0, built-ins and existing workspace dependencies only.

| Check | Observation |
| --- | --- |
| New lifecycle/counting domain tests | 17/17 PASS |
| New health-sampler tests | 8/8 PASS; real 3s timeout/abort path, no network |
| New suites combined | 25/25 PASS, none skipped |
| Usage workspace build | PASS, includes syntax checks for both new source modules |
| Existing runtime/authorization HTTP regressions | 20/20 PASS, controlled loopback; not new Usage route acceptance |
| Available Usage/routing/Content-tool suites on original base | 99/99 PASS across 10 files, none skipped |
| Same module discovery after PR89/90/92 integration | 101/101 PASS; 11 files include the merged readiness suite |
| Public Content inventory reproducibility | PASS, 240 metadata rows, no fresh live verification |
| Merged Content readiness report | PASS, repository-only, no live execution |
| Deterministic lifecycle cross-check | 600 generated events compared with the existing independent semantic oracle |
| Concurrent starts | 40 same-ID starts produce one retained playback in the serialized transaction model; conflicting-owner race has one winner |
| Start/end interleaving | End commits while start waits on admission; post-admission recheck preserves the tombstone |
| Fault injection | Rollback before commit; lost acknowledgement after commit; explicit duplicate start preserves original timestamps |
| Payload/clock/snapshot failures | No state creation from malformed/extra/IP/GPS/client-time inputs; corrupt or future snapshots fail without partial counts |

The package JSON was normalized to LF after the whitespace check flagged CR on the
edited script lines; the final whitespace scan passes. No test failed.
Current app/authorization behavior is deliberately
unchanged; passing existing HTTP authorization tests does not mean the new domain
library is mounted behind those guards.

Reproduction:

```powershell
npm run build --workspace=@vinlook/usage
npm run test:domain --workspace=@vinlook/usage
node --test tests/authorization.test.mjs tests/runtime-health.test.mjs
$moduleTests = Get-ChildItem services/usage/test,packages/poc-routing/test,scripts/poc/content/test -Recurse -File | Where-Object { $_.Name -match '\.test\.(mjs|js)$' -and $_.Name -notmatch '\.integration\.test\.' } | ForEach-Object FullName
node --test $moduleTests
node scripts/poc/content/cli.mjs inventory --check
```

## Model/test versus real acceptance

Lifecycle code is actual reusable implementation; its store and public admission
dependencies are injected and replaced only in tests. The test store serializes
and clones memory. It does not prove Mongo transaction/index behavior, snapshot
capacity, retained history, process restart durability, actual HTTP admission or
multi-instance races. Health tests use trusted synthetic probes; no real service,
worker heartbeat or global jobs aggregate was read.

No Usage business endpoint, Mongo schema/index/catalog/apply, live account/login,
production CORS/rate limiting, cloud/Atlas/provider, real multidevice, deployment,
load/p95 or retention/backup/restore acceptance was performed. Existing disposable
Identity/Content regression CI is distinct from an as-yet absent Usage Mongo suite.
No screenshot/video applies to the library slice. No env names/migrations added.

## Decisions and next implementation sequence

1. Duy approves/amends U1–U4 in #70, including complete summary and health/jobs wire,
   source admission, strict bounds, capacity/concurrency, CORS/errors/config.
2. Duy selects the Usage-owned Mongo library/pin and root-lock integration, then
   confirms explicit collections/validators/index catalog and provisioning policy.
3. Build a real store adapter and guarded disposable replica-set suite; exercise
   same-ID races, end-before-start, atomic presence/playback, rollback and DB-down.
4. Mount the approved visitor and monitor routes with existing fresh Identity
   Staff/Manager guard (no work-session requirement), bounded input/rate/CORS and
   exact public Content admission. Run real loopback Usage HTTP and RBAC tests.
5. Implement health/jobs only with approved service-owned status bridges. Missing
   global jobs or worker samples remain unknown/null; never read another DB or
   fabricate zero/up. Live catalog/deploy changes need a separate approved plan.

This PR is the first independent code slice, not completion of #71. The issue's
full implementation, real DB/HTTP/RBAC, review/merge and live AC boxes stay unticked.
