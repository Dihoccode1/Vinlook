# TU05 independent slice: PoC CI and Usage image

Refs #75. This slice can be reviewed independently of TU01/#70/PR83 contracts.
Base `codex/poc-demo`, seed `f8058292169d994ae75116b078e3103cded34018`;
task branch `codex/poc-tu-05-deploy`. No contract endpoint or production config is
changed. Duy reviews/merges; #75 remains open for unfinished live acceptance.

## What this slice does

- Adds `.github/workflows/poc-backend.yml` alongside the unchanged original workflow.
  PR filter is **base** `codex/poc-demo`; push filter is the integration branch;
  backend/routing/scripts/tests/package/workflow changes trigger checks. Manual
  workflow_dispatch is also available once the workflow is discoverable on GitHub.
- Pins the same official checkout/setup-node action SHAs and Node24.18.1/npm11.16.0
  used by the baseline. Each job verifies versions and uses npm ci/lockfile.
  Checkout uses the exact PR head (or push SHA), credentials are not persisted,
  permissions are contents:read. No pull_request_target, environment secrets,
  deploy hooks, paid resources, keepalive, schedule, image registry push or auto-merge.
- Usage job runs build/syntax, independent scaffold listeners and existing runtime/
  authorization suites. It discovers non-integration `.test.js` and `.test.mjs`
  under services/usage/test and packages/poc-routing/test. Test failure/timeout
  fails the job. Missing suites get an explicit notice/summary, **not a test pass**.
- Identity/Content regression jobs reuse their existing syntax/unit runner and
  disposable labelled Mongo replica-set integration runner. Current suites are
  eight Identity + nine Content invocations. Only runner-created temporary Mongo
  containers are removed; no Atlas URI or production credential is provided.
- Builds `services/usage/Dockerfile` from the locked dependency stage and the
  baseline digest-pinned Node image. Final image contains Usage package/src and
  production dependencies only. Dockerfile-specific ignore is an allowlist, so
  .git, tests, docs, downloads, other service source, .env and keys are not build
  context. This companion ignore file is needed to make the new image's context safe.
- Smoke starts the **real default CMD**, with nonroot user, read-only filesystem,
  network none, no privileges/capabilities, 256MiB and one CPU. It checks image
  inventory, live200/no-store, intentionally unverified ready503, invalid HOST
  rejection before listening and graceful SIGTERM exit0/no OOM.

Usage is still the baseline health scaffold. There is no Usage business Mongo
suite yet, no implemented monitoring endpoint, no new database/schema/index, no
live caller-key acceptance or readiness claim. TU02 must add its approved DB
integration coverage and update bootstrap smoke for its actual configuration;
do not bypass a future startup failure by replacing CMD with createApp().

## Reproduce

Use the repository's pinned runtime, installed lockfile and a working Docker daemon:

```text
npm ci --no-audit --no-fund
npm run build --workspace=@vinlook/usage
npm run check:scaffold
node --test tests/runtime-health.test.mjs tests/authorization.test.mjs
node scripts/ci-service-checks.mjs identity
node scripts/ci-service-checks.mjs content
node scripts/ci-service-integration.mjs identity
node scripts/ci-service-integration.mjs content
docker build --file services/usage/Dockerfile --tag vinlook-usage:poc-ci .
```

For image smoke, use the exact inline Node step in poc-backend.yml; it creates one
unique temporary container and cleans it in finally. It uses no host port, DB,
provider, real token or target URL. A workflow run against a specific reviewed
head is the portable Linux reproduction of all steps. The raw image smoke text
is versioned in the workflow, rather than requiring an unpublished script.

Optional module-test discovery deliberately excludes `.integration.test.js/mjs`:
an integration suite must run through its owning disposable fixture launcher,
never receive an arbitrary database URI. PR83 is not cherry-picked/merged into
this branch. After Duy integrates it, its two module test files will be discovered.

## Observed local evidence, 26 October 2026 UTC+7

| Check | Result / boundary |
| --- | --- |
| Exact runtime | Node24.18.1/npm11.16.0 from verified official Node archive; system runtime unchanged |
| Usage build | PASS |
| Existing runtime + authorization tests | 20/20 PASS with local-loopback access; no live service/DB/provider |
| Workflow lint | actionlint1.7.12 PASS; downloaded official release ZIP matched its SHA256 `6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9`; optional shellcheck/pyflakes executables not available and disabled for this local lint |
| Inline Node syntax | Both workflow scripts parse under pinned Node |
| Module discovery, this baseline | Explicit missing-suite notices, zero module files; not labelled 21 tests passed |
| Forward discovery compatibility | In a scratch directory outside the clone, exact test/fixture blobs from unmerged PR83 head f0a1425f352b08e159f500851459e21c14a9bd1d plus its registry were supplied to the real discovery step: 2 files/21 tests pass. This is a fixture overlay, not a branch merge or approval |
| Failure propagation | Separate scratch fixture with one intentionally failing test causes discovery step exit1, as expected; failure was not swallowed |
| Local Docker daemon | NOT RUN: docker version cannot reach dockerDesktopLinuxEngine pipe. No local image/integration success claimed; actual Linux CI evidence is recorded in PR/#75 when observed |

Original root dependency/lock, original workflow, Usage/Identity/Content business
source, shared contracts and Hạo files stay unchanged. Only the five-file CI/image/
documentation inventory is published after staged scope/credential/whitespace scan.
Tool downloads, temporary overlay/failure fixture, local environment and logs are
outside Git publication. No screenshots/video apply to this non-UI slice.

## Remaining gates

CI run links and exact head belong in the PR handoff; pending/no run is not success.
Green packaging checks do not complete #75. Usage business tests/runtime/catalog,
deployed authorized monitoring, multidevice counts, cold start, approved load target,
artifact hosting, backup/rollback and Duy acceptance remain unverified. See
[deployment-handoff.md](deployment-handoff.md). Duy decides review/merge into
codex/poc-demo; no PR in this slice changes shared contracts or deploys to main.
