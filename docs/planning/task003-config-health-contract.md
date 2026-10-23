# TASK-003 — Runtime and minimal health contract to approve

Date:23October2026. User approved TASK-003 scope. Existing D-007/D-008/D-017 establish secret ownership, topology and monitoring semantics, but do not specify process environment names or public liveness/readiness routes. This document proposes those details before code changes under Master Prompt Rule1.

## A — Recommended minimal implementation

### Process configuration

| Variable | Development/test | Production |
|---|---|---|
| NODE_ENV | Default development; allow development/test/production only | Explicit production |
| HOST | Default127.0.0.1 | Required, must be0.0.0.0 for the approved container/Render direction |
| PORT | Default3001 identity/3002 content/3003 usage; integer1–65535 | Required integer1–65535; hosting-provided value is used |

Validate before opening a socket. Reject invalid modes, whitespace-only host and invalid port; no silent numeric coercion such as 3001abc. Report field names and stable codes only, never environment values or a complete process.env dump. No production credential is needed to test configuration rejection with synthetic fixtures.

Local examples live beside each service as `.env.example` with nonsecret process settings. Use Node24 native `--env-file-if-exists=.env` for start/dev; shell/deployment values take precedence over file values. Real `.env` files stay ignored. No dotenv dependency or frontend environment exposure is added.

This task validates only configuration consumed by the existing process. Database/auth/provider configuration will be added when the owning component is implemented, rather than inventing unused credentials or requiring fake secrets to make a scaffold start. A production process can be alive while explicitly not ready for business traffic.

### Minimal HTTP contract

| Route | Public response | Meaning |
|---|---|---|
| GET /health/live | HTTP200 `{data:{status:"up"},requestId}` | Current process can respond; not a DB/provider/business readiness claim |
| GET /health/ready | HTTP503 `{error:{code:"DEPENDENCIES_UNVERIFIED",message:"Service dependencies are not verified",requestId}}` | Until owned dependencies are implemented and actually checked, do not report ready |

Use a server-generated UUID requestId for these responses and `Cache-Control:no-store`. Do not echo client request IDs without a separate validation contract. Do not expose connection strings, credentials, hostnames, provider messages, environment values or stack traces. This path naming is new and requires approval; existing protected `/monitoring/health` and `/monitoring/jobs` remain unimplemented/404 until real staff auth exists.

No background polling, synthetic success, cross-service DB checks or keep-awake requests. D-017 freshness/3second timeouts will apply when actual dependency sampling is implemented; an unimplemented dependency is not turned healthy by a timer.

### Verification and delivery

Use the approved Zod validator with an exact compatible version/lockfile. Test invalid production config fails before bind; logs/errors omit sentinel secrets; content/usage never receive an Identity signing key through shared config; all three independent liveness routes respond, readiness stays503 and unimplemented business paths remain404. Check per-service isolation and listener cleanup. Repeat build and scaffold smoke after config changes. No provider calls or production credentials required.

PR follows merged TASK-002, with runtime guide/example updates and actual evidence. Review and merge still required even if Issue6 is closed before implementation. Dockerfiles/workflows/deployment remain separate tasks.

## B — Liveness only at this stage

Implement the same process configuration and public `/health/live`; defer `/health/ready` until real owned-dependency checks exist. Smaller API surface now, but deployment readiness must not rely on liveness and the later readiness contract remains unresolved.

## Pending decision

Approve A (including the variable names/defaults, paths, envelopes and deliberate503 readiness) or choose B. This is contract approval only, not a request to provide keys, enable hosting or change product scope. No TASK-003 code changes have been made.

## Approved — DEC-117

User selects A. Process settings, defaults/production requirements, native env-file behavior and the two health endpoints/envelopes are approved. The original pending/no-code wording above records the proposal stage. Implementation evidence is in task003-implementation-evidence.md; release readiness remains false until actual dependencies exist and pass checks.
