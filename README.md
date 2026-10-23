# Vinlook

Mobile-first tourism web application for Ho Chi Minh City, with location-based discovery, walking navigation and reviewed multilingual audio guides.

## Project baseline

- Educational, noncommercial prototype; free services only.
- Fixed delivery window: 22 October–25 November 2026, 35 calendar days including requirements and design. 26 November–2 December is reserved for UI/performance optimization.
- All six feature groups remain must-have: map/GPS/POI discovery, walking routes, translation/audio pipeline, versioned POI data, staff administration and live usage monitoring.
- Initial dataset: 15 POIs; 16 online languages. A fully downloaded offline package must support English map, search, location, walking routes/recalculation, text, audio and images, including offline reopening.
- Current full administrative boundary of Ho Chi Minh City. Nearby discovery returns at most four POIs within three kilometres; navigation targets one selected POI at a time.

## Approved architecture

React 19, Tailwind CSS 4 and shadcn; JavaScript ESM/JSX with JSDoc; Express and Mongoose; MongoDB Atlas; JWT/RBAC and bcrypt cost 12. Three backend services own Identity/Staff, POI/Content and Usage/Monitoring data respectively. A local Python worker handles MMS synthesis and media processing. Gemini handles translation and complementary TTS; Cloudinary stores published media.

Docker/Compose for reproducible runtime; GitHub Actions for CI/CD; Vercel frontend and Render Free backend. Render operation is on demand, with workspace-shared quotas and cold starts. No paid fallback or keep-alive workaround.

## Current state

Requirements, design and the initial backlog were approved. TASK-002 provides a React preview and three Express scaffolds; TASK-003 runtime/health and TASK-004 Identity models are merged. TASK-005 pending signup, active login, bcrypt/JWT and durable auth limits are merged. Other business features, product CI/CD and hosted Vinlook backends remain pending.

TASK-006–010 Identity backend and operator CLI code are merged; native human terminal/real operational acceptance remains pending. TASK-011 Content-owned POI/revision/localized schemas are merged. TASK-015 transactional outbox/idempotency primitives are merged. TASK-012 protected draft APIs are merged. TASK-019 adds backend media upload/verification/reconciliation for review, with only synthetic provider acceptance so far. Real Cloudinary/Atlas provisioning, pipeline, curated data, frontend administration and overall readiness remain pending. See [TASK-019 evidence](docs/planning/task019-implementation-evidence.md). See [TASK-011 evidence](docs/planning/task011-implementation-evidence.md).

Routing research selected JavaScript A* with a preprocessed walking graph. Actual iPhone evidence exists; Android testing was explicitly waived, not passed. Research evidence is not full navigation acceptance.

Representative MMS English/Pidgin audio and four short Gemini TTS outputs were generated. One synthetic English sample lasts 138.944 seconds. Pronunciation/dialect review, complete 15×16 published content, all-language runtime checks and end-to-end integration remain open. No secrets or model weights belong in this repository.

The full Day 5 milestone remains required but is not supported by the present capacity/quota evidence. Do not treat repository setup, account setup or sample generation as MVP completion.

## Documentation

- [Design gate](docs/design-review-dossier.md)
- [Decision log](docs/decision-log.md)
- [Product backlog](docs/planning/product-backlog.md)
- [GitHub plan](docs/planning/github-plan.md)
- [Test plan](docs/test-plan-proposal.md)
- [Traceability](docs/traceability-matrix.md)
- [Contribution and review process](CONTRIBUTING.md)
- [Local scaffold commands and boundaries](docs/development.md)

Some documents retain historical proposal wording. Their approval sections and later numbered decisions determine current status. Task completion requires actual deliverables and review evidence, even when its GitHub issue has been closed.

For local setup, use the exact Node/npm versions and commands in the development guide. Identity auth startup now requires private backend configuration and an already provisioned owned database/index catalog. Isolated tests generate synthetic keys and do not need Atlas/provider credentials. See [TASK-005 evidence and remaining gates](docs/planning/task005-implementation-evidence.md).

TASK-013 adds staff language review/submission and Manager return/atomic publication, with preserved published history and durable replay. See [contract](docs/planning/task013-review-publication-contract.md) and [isolated evidence / remaining gates](docs/planning/task013-implementation-evidence.md). An explicitly approved model registry and real provider acceptance remain required; current runtime does not silently enable publication without them.

TASK-014 adds Manager soft delete/restore-to-draft and login-free published POI/search/nearby/withdrawal reads. Restore requires re-review; public pagination rejects mixed snapshots. Public endpoints need an optional dedicated backend cursor key and otherwise fail503. See [contract](docs/planning/task014-public-lifecycle-contract.md) and [isolated evidence / remaining gates](docs/planning/task014-implementation-evidence.md).
