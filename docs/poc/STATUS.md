# PoC status / journal

> Current PoC scope,26October2026: online-only by Duy. Offline requirements in historical sections/examples are superseded by [ONLINE-SCOPE.md](ONLINE-SCOPE.md). Full online walking navigation,15POIs/16locales,AdminA and Monitoring remain mandatory.


26/10/2026 UTC+7 — current scope ONLINE; product NOT READY until live acceptance.

Current verified integration checkpoint: d2cd31ae915d48a375d91d575314eed7e8ec748d (PR101 merged). Tourist/Admin/Monitoring code and Usage HTTP mapping are integrated;41web units and5Admin/Monitor Chrome fixture tests passed locally on the PR implementation. This is not a new live run. Real map/graph, current content inventory, hosted CORS/Usage readiness and device acceptance remain critical. Offline work is removed from this PoC by Duy's explicit instruction; see ONLINE-SCOPE.md. Web merge-commit CI coverage is corrected in this scope follow-up. Duy owns former Hạo issues76–80; Tú owns backend/data/graph issues.

The following section is historical startup context, not current implementation status:

- Original remote main:43a17696bf515cc1f97fc89138e8927f425efdff (PR69). Local branch unknown: no repository .git here, git parent resolution failed. No local checkout/reset/clean performed, original edits preserved.
- Separate integration branch codex/poc-demo created from that exact main; documentation seed712a49d88893f9fa205ca150b1a59c5d0083bf00. No main mutation/PoC merge.
- User confirmed AdminA and full routing/offline/15POI required, no silent reduced demo. Existing approved3locale onPOI001, remainder not accepted.15publicPOI needs240pairs under unchanged gate.
- GitHub tracker81 and ten assigned implementation Issues created. Both accounts have write and assignments verified. Human implementation/review/merge/live acceptance not yet observed.
- Schedule target two days, precise demonstration time not supplied. Very high feasibility risk; escalate any shortfall to Duy, no fictional completion or scope cut.
- Baseline backlog/issues untouched. Live environments/data/secrets unchanged by this planning handoff. No product tests/load tests/deployment performed or claimed.

Concurrent GitHub event observed during final verification: main advanced to4852688d12f4825117550ce3d65eedaf1dbaf542 through PR72 merging documentation seed712a49d88893f9fa205ca150b1a59c5d0083bf00 from codex/poc-demo. This agent did not create/merge PR72 and performs no revert. The five-file change is PoC documentation, not product completion. Original43a1769 remains the recorded pre-PoC checkpoint; do not reset current main to erase the concurrent merge. Future implementation PRs still target codex/poc-demo and require Duy's decision. Branch final-index commit2193e17562d3c1e433cd465eacf1b67058895703 contains linked Issues; newer status record follows.

Daily journal format: timestamp,person,Issue,branch/commit,done/evidence,next,blockers/questions,live operations authorized. Contributors maintain their own docs/poc/tu or hao evidence; Duy updates shared status after verification.

Return instruction: only on exact user message `quy lại tiến độ`, record PoC branch/SHA/openPRs/URLs/artifacts, preserve all local edits and deployments, fetch original baseline and read retained TASK025/batch/decisionlog before continuing original work. Never reset dirty tree or auto-merge PoC into main; use separate checkout/worktree if needed and authorized. At handoff original TASK025 remains open,3/80approved and next locale not selected.
