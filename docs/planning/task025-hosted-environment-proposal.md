# TASK025 hosted prerequisites and deployment proposal

25 October 2026 UTC+7. User approved continuing HTTPS/free-quota preparation. Actual account pages read without changing billing, keys, provider access or deployment.

## Account observations

- AI Studio project vinlook shows Free tier. For Gemini 3.5 Flash Lite: RPM15, TPM250000, RPD500. For Gemini 3.8 Flash TTS: RPM3, TPM10000, RPD10. The page displays historical peak usage over 28 days; 3/3 RPM and 4/10 RPD on TTS do not establish currently remaining allowance. No API key viewed or used. Confirmation must be renewed within the existing seven-day rule before activation.
- Proposed application caps: translation RPM10/RPD100; TTS RPM2/RPD8, within observed provider ceilings. These are application ceilings, not remaining quota or a guarantee against TPM exhaustion. Existing provider errors/uncertain-outcome handling stays in force. Twenty successful cloud TTS jobs require at least two provider quota days at ten/day, or at least three application-budget days at eight/day, excluding errors/retries and other consumers. No paid tier or key/project rotation.
- Render workspace shows Hobby, no card on file, Free instance hours0.68/750, pipeline0/500minutes, service usage2/25. These are point-in-time observations for this workspace, not capacity reservations. Git Provider new-service form shows no repositories connected. Existing services/projects are unrelated and will not be modified.
- Remote main tree has no Identity/Content production Dockerfiles and no GitHub workflow files. Content FFmpeg disposable test Dockerfile and local MMS Dockerfile exist. A hosting form cannot replace missing deploy packaging/CI gates.

## Proposed implementation scope

Keep approved topology and pinned Node24.18.1/npm11.16.0, existing Debian FFmpeg version/checksum and service boundaries. Add separate production Dockerfiles for Identity and Content using exact root dependency lock/workspace installation and nonroot execution. Content includes the existing pinned FFmpeg/probe. Build from an explicit allowlist with a deny-by-default Docker context so local secrets/research/model/audio files cannot be uploaded. No dependency upgrades.

Add GitHub Actions PR checks for affected service syntax/unit/integration on disposable Mongo replica set and actual production-image builds/smoke tests. Serialize trusted-main deployment; keep hosting auto-deploy off. Deploy only reviewed commit after checks; poll completion and smoke actual HTTPS before reporting success. Deployment credentials must stay in protected GitHub/Render settings and are not part of this proposal or chat. No bypass of CI by creating a manual production release before packaging checks pass.

After implementation review/merge and successful build checks, create two Render Free Docker web services named vinlook-identity and vinlook-content, proposed Singapore region, root build context, per-service Dockerfile and HOST=0.0.0.0. Leave Gemini disabled initially. Resolve exact healthcheck path from implementation and distinguish liveness from dependency readiness; a scaffold health200 is not live batch acceptance. Use public repository source if supported with auto-deploy off; otherwise GitHub integration/access setup requires a concrete separate handoff before granting access. Do not enable paid add-ons, add a card, reuse unrelated projects or deploy Usage as part of this first two-service prerequisite step.

Provisioning live DB collections/indexes, operator bootstrap/catalog admission and supplying actual credentials remain separate concrete steps. Secrets must be entered privately for their intended service, never committed or pasted in chat. Public URLs can be recorded after creation. Actual startup, service authorization, transaction/index readiness, media binding and provider preflight must pass before batch jobs.

## Decision requested

Approve the two-service packaging/CI implementation, proposed Singapore region and conservative application Gemini caps above for isolated verification. This approval does not itself grant new GitHub account permissions, authorize paid resources, or initialize production data. Actual Render service creation follows reviewed buildable configuration; secret entry and any new access grant are handled at the specific setup step.

## Approval recorded

25 October 2026: user approved implementation and isolated verification. Production packaging and verification CI implemented; actual Render creation, credentials, live database admission and gated CD activation remain separate future steps. See task025-hosted-packaging-verification.md and ../setup/task025-render-runbook.md.
