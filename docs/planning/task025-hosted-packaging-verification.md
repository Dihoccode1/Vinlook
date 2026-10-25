# TASK025 hosted packaging verification

25 October 2026 UTC+7. User explicitly approved isolated implementation/testing of Identity/Content production Dockerfiles, CI, Singapore and conservative application caps. No Render creation/Atlas initialization authorized or performed in this step. Duy implements, Tu reviews.

## Result

- Fresh production Docker builds succeeded for both services using the existing Node digest/npm lock and pinned Content FFmpeg package/checksum. Context transfer about210kB/208kB; Dockerfile-specific deny-by-default context filters exclude private workspace files. No dependency upgrades.
- Production images passed nonroot/read-only/network-none packaging smoke: liveness200 and intentionally unverified readiness503. Content's pinned FFmpeg/probe plus independent 90-second synthetic PCM conversion passed: MP3 90.048seconds,720428bytes,mono24kHz. This is fixture conversion, not model narration.
- Syntax/unit/health/authorization checks passed for both service runners. Service unit groups: Identity15, Content46; shared health/authorization20 executed in each runner. One Linux converter test runs in the actual Content image rather than host OS. Do not double-count shared checks.
- All fifteen disposable replica-set suite invocations passed: seven Identity, eight Content, including adapter integration with fake providers. Adapter suite imports the jobs fixture/tests, so some job tests execute twice; no inflated unique-case claim. Each suite used a fresh uniquely named pinned Mongo container/DB, exact required labels and replica-set name; all were removed in finally. No Atlas or real provider used.
-74 source/package/lock inputs used by local builds matched remote main after checkout line-ending normalization. New scripts/workflow checked for whitespace. Local PyYAML is unavailable; workflow parsing and execution require the hosted PR run. Local success does not assert hosted CI success.

## Failures resolved and limits

Initial sandbox host runs could not connect to loopback fixtures; rerunning the same checks with explicit local execution permission passed. Initial Content host unit discovery included a Linux-only FFmpeg test, which rejected Windows. Final runner executes portable units on host and the converter test inside production Content Linux image; all passed without weakening assertions. Initial smoke probe may observe startup ECONNREFUSED before the bounded retry succeeds; final checks passed.

Image smoke imports createApp without a DB-backed runtime to establish packaging and health semantics. It does not validate live entrypoint credentials, Atlas catalog, Render memory/cold start or public HTTPS. Readiness remains503. Worker cross-runtime integration is not part of this two-service CI step. No new live provider/model inference, audio batch, media upload or publication. TASK025 remains open0/80final pairs.

CI is verification only, with pinned checkout/setup-node, read-only repository permission and no secrets or pull_request_target. No CD credentials/service IDs exist yet; hosting auto-deploy must remain off. Later trusted-main deployment gating/completion polling and real environment setup remain required before any release. See docs/setup/task025-render-runbook.md.
