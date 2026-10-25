# TASK025 Identity catalog verification

25 October 2026 UTC+7. Approved A, Duy implementation / Tú review.

Added separate local catalog CLI, strict vinlook_identity URI and confirmation guard, hidden TTY URI input reused from approved operator prompt, read-only plan and additive apply derived from existing model declarations. Existing schemas, production startup and read-only index verifier unchanged. No new dependencies.

Local Node24.18.1 verification: six new catalog unit groups passed. Identity check runner passed21unit groups and20shared health/authorization groups. All eight Identity disposable Mongo integration suites passed, including three new real catalog groups. Initial shared tests under restricted loopback failed EACCES; rerun with loopback permission passed without assertion changes. Docker required existing engine access; no Atlas used.

Fresh catalog CLI plan left database empty; apply created5collections+8indexes, existing verifier passed, rerun completed0operations. Fixture data/unrelated collection remained unchanged. Conflict in final target prevented creating earlier missing target. Synthetic partial failure reported completed count and read-only plan showed remaining operations. Real CLI help and redirected hidden input verified.

CI integration runner now includes TASK025 catalog fixture, making16Identity+Content suite invocations across both jobs. Both production image checks and all existing suites run on the PR. No hosted CI success inferred until exact-head result is observed.

No live URI/key read or entered, Atlas connection/write, account bootstrap, Render deploy, provider request/upload or audio batch. TASK025 remains open0/80finalpairs. Reviewer runbook: docs/setup/task025-identity-catalog.md.
