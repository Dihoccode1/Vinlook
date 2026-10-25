# TASK025 Identity/Content deployment preparation

25 October 2026 UTC+7. Packaging/CI, Singapore and application caps approved. No services created and no live database initialized by this change.

## Review and build gates

`Backend checks` runs on PRs, trusted main changes and manual dispatch, for Identity and Content. Both are checked when backend/shared inputs change, covering cross-service consumers. Workflow has read-only contents permission, pinned action commits, no deployment secrets, and no pull_request_target. PR runs can cancel older PR runs; main runs are serialized without cancellation. Checks include source syntax, unit/health/authorization tests, fifteen isolated Mongo replica-set integration suites, actual production Docker builds and image/converter smoke.

This workflow verifies code only. CD credentials, exact service IDs and deployment completion polling are not configured yet, so no deployment is silently triggered. Keep Render auto-deploy disabled until a reviewed trusted-main release workflow can enforce successful checks and verify the deployed commit. Usage/frontend/worker CI and CD are separate remaining product work; this two-service workflow does not claim their coverage.

Build locally from repository root:

```text
docker build -f services/identity/Dockerfile -t vinlook-identity:review .
docker build -f services/content/Dockerfile -t vinlook-content:review .
node scripts/ci-image-smoke.mjs identity vinlook-identity:review
node scripts/ci-image-smoke.mjs content vinlook-content:review
```

Dockerfile-specific context filters start with `**`, then admit only lock/package metadata, runtime check script and the selected service source. They exclude environment files, keys, node_modules, private research/model/audio artifacts and unrelated application source. They do not modify the existing worker Docker context. Production dependency install is restricted to the selected workspace and excludes dev dependencies; no tests/operator CLI are copied into runtime. Image uses nonroot node, exec-form server command and HOST=0.0.0.0; Render supplies PORT (image default10000). No credentials are build arguments or image environment defaults.

## Render settings after review/build gates

| Setting | Identity | Content |
| --- | --- | --- |
| Name | vinlook-identity | vinlook-content |
| Source | Dihoccode1/Vinlook, reviewed main SHA | same |
| Runtime / region / instance | Docker / Singapore / Free | same |
| Root build context | repository root | repository root |
| Dockerfile | services/identity/Dockerfile | services/content/Dockerfile |
| Health check | /health/live | /health/live |
| Auto-deploy | Off until gated CD configured | same |

`/health/live`200 demonstrates a listening process only. `/health/ready` intentionally returns503 DEPENDENCIES_UNVERIFIED; do not weaken it or use it as a Render startup health check in this scoped step. Content smoke validates the production configuration loader and runs the actual default server command with Gemini disabled and no DB credentials. Identity smoke imports createApp without runtime because its entrypoint requires private configuration. Neither proves a configured production server connects to a live database. Dependency-backed API readiness must be tested separately before batch jobs.

Identity requires a valid owned DB URI, exact existing index catalog, distinct JWT/rate/caller keys and explicit HTTPS allowed origins. Content requires its own owned DB/catalog, exact Identity HTTPS origin, matching dedicated caller key, worker identity/key, media configuration and public cursor key as applicable. Use existing .env.example contracts, enter real secrets privately, never log/commit them. Creating indexes/bootstrap/operator records in Atlas requires a separate explicit data operation and verification. A scaffold Content process without runtime is not batch-ready.

Gemini stays disabled until project and binary/catalog readiness checks succeed. Leave adapter-only environment settings, including CONTENT_FFMPEG_PATH and CONTENT_FFPROBE_PATH, unset while disabled; set them with the complete approved adapter configuration when enabling Gemini. The image still installs the pinned binaries. Reviewed application ceilings: translation10RPM/100RPD; TTS2RPM/8RPD. Observed project ceilings on25October: translation15RPM/500RPD/250000TPM; TTS3RPM/10RPD/10000TPM. These are ceilings, not remaining allowance; historical peak dashboard values do not prove today's remaining quota. Supply a fresh actual confirmation timestamp, valid at most seven days, and the private key only when activation is separately ready. No billing upgrade, alternate project or automatic retry of uncertain requests. Twenty cloud TTS successes need at least three application-budget days at eight/day, ignoring other usage/errors/retries.

No provider activation, seed/admission, generation, upload or publication is included here. TASK025 remains open with0/80final pairs. Old-source English canary and model-file integrity do not establish current narration/language quality.
