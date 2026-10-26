# Maintaining the deployed PoC source

This refactor starts from the deployed `codex/poc-demo` commit
`2996e22c34204a3c9d5204ec96fd66e37235b2e9`.

## Module responsibilities

- `tourist/TouristApp.jsx` composes the visitor workspace. Resource hooks own catalog
  requests, POI detail requests, nearby location and audio/telemetry lifecycles.
- Each tourist hook keeps cancellation, event subscriptions and cleanup together.
  Preserve generation checks and aborts: old locale/search responses must not replace newer data.
- `tourist/components` contains reusable image rendering, place details and the mini player.
- `staff/Admin.jsx` coordinates authentication, editing state and mutation orchestration.
  Its six `staff/sections` components render the existing content workflow.
- `staff/draft-input.js` owns the empty draft shape shared by the editor and its new-draft action.
- Adapters own transport and response validation. UI components must not read secrets,
  persist JWTs or bypass adapters to call administrative endpoints.
- Backend service modules keep their transaction, authorization, idempotency and media
  verification boundaries. Formatting does not change those contracts.

## Before handing off a change

Use the pinned Node/npm versions from `package.json`, then:

```sh
npm ci
npm run format
npm run check:code
node tests/poc-web/e2e/run-tests.mjs unit
npm run build
```

Run the existing isolated browser regressions when changing React lifecycles or workflow
components. Test fixture instructions remain in `docs/poc/hao/demo/README.md`.
Do not use production provider calls or Atlas writes as a substitute for local verification.

ESLint rejects undefined/unused references, unreachable statements, duplicate object keys
and loose comparisons other than intentional null/undefined checks. ESLint10 tracks JSX
references directly. Prettier fixes formatting consistently across JavaScript/JSX/CSS runtime
source. Both run in CI; neither tool replaces code review.

Keep identifiers meaningful, separate independent resource lifecycles, extract a component
when it represents a workflow section, and preserve observable behavior during refactors.
Avoid adding abstraction layers that merely forward every argument.

Formatting excludes translated JSON resources and generated map/credit artifacts. Their
bytes and hashes are part of other contracts; do not rewrite them as part of source cleanup.
The Python worker and operator scripts retain their existing behavior and validation gates.

## Review and rollout

Review the component/hook extraction separately from the formatting-only changes in
backend/routing modules. Merge into `codex/poc-demo` after the existing CI and new code-quality
check pass, then deploy the exact merge commit. The production deployment stays unchanged
until that rollout; no database migration, new runtime dependency or secret change is required.
