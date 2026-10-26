# TU03 post-merge verification and batch-readiness follow-up

Refs #73 and #81. Executed 26 October 2026 (UTC+7), pinned Node24.18.1/npm11.16.0.
Branch `codex/poc-tu-03-batch-readiness` starts at merged integration commit
`bca97f269030b656a990e17628e2144a5f66b482`. PR85's Content head
`afa1bdc0d66e2b1b6676d55201d0ddd7a8421447` is an ancestor of that commit; PR83/84/86/87
are present as well. Duy merged PR85 and closed #73. This follow-up preserves those
GitHub decisions and records remaining live evidence separately.

## Executed on the merged baseline before changes

| Check | Observed result |
| --- | --- |
| `npm run build` | PASS across web/Content/Identity/Usage; web resource human review remains pending |
| `npm run check:scaffold` | PASS; three listeners closed, no database/provider requests |
| All non-integration `*.test.mjs/js` under Usage, routing and Content tools | 74/74 PASS, none skipped; includes actual read-only HTTP tests on temporary loopback servers |
| `node scripts/poc/content/cli.mjs inventory --check` | PASS, 240 rows, 0 fresh live verifications |

No dependency installation, lockfile or global runtime change was needed. The local
build/test result does not establish deployed API/RBAC, real database, provider,
map/audio quality, device, Docker image or load acceptance.

## New report and plan

`readiness.mjs` derives a public gap register from the same repository inventory:
15 × 16 cells, exactly three preserve-and-revalidate historical reports, 237 cells
with no historical report, and zero freshly verified pairs. Exact remaining jobs
and provider call budget stay unknown. The report records source/media/arrival
gaps, separate locale/execution ceilings and the 6–10 reviewer-hour full-listening
workload. It never reads private state or performs live operations.

Two tests protect the distinction between historical reports/current readback/
completion/call approval, counts and execution split, report reproducibility and
CLI check behavior without mutation or secret reflection. They are automatically
discovered by the merged PoC backend workflow; their report comparison fails if
the generated Markdown is stale. No workflow/core/shared contract change is needed.

Reproduce with the pinned runtime:

```powershell
npm run build
npm run check:scaffold
$moduleTests = Get-ChildItem services/usage/test,packages/poc-routing/test,scripts/poc/content/test -Recurse -File | Where-Object { $_.Name -match '\.test\.(mjs|js)$' -and $_.Name -notmatch '\.integration\.test\.' } | ForEach-Object FullName
node --test $moduleTests
node scripts/poc/content/cli.mjs inventory --check
node scripts/poc/content/readiness.mjs --check
```

Final follow-up suite: **76/76 PASS**, none skipped. Inventory and readiness checks
PASS. The 74-test baseline and 76-test follow-up are separate executed observations;
the readiness count includes two new tests. Final exact head, publication scan,
remote file comparison and actual CI are recorded in the GitHub PR handoff.

The batch plan is proposed: private environment/identity/versions, permission,
worker inventory, independent attempt ceilings, recovery and reviewer fields are
unset. It includes at most 45 proposed Content GET attempts after separately scoped
mapping; a missing execution bridge or global dispatch admission still blocks a
real pilot. No live login/read/mutation/provider/upload/worker/deploy/publish was
performed. No private files inspected, media downloaded, rights granted or human
approval generated. Non-UI: screenshot/video N/A. No migrations or env names added.
