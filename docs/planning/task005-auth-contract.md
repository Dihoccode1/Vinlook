# TASK-005 — Authentication implementation contract

Date:23October2026. TASK-005 scope confirmed by Duy/Tú. This concretizes missing choices before code under Master Prompt Rule1. Existing password, token lifetime, pending account and rate thresholds remain unchanged.

## A — Recommended configuration and startup

Identity alone consumes:

| Variable | Rule |
|---|---|
| IDENTITY_MONGODB_URI | Required secret connection string for Identity-owned DB. No fallback to another service URI or Atlas admin credential |
| IDENTITY_JWT_KEY_B64URL | Required canonical base64url encoding of at least32random bytes |
| IDENTITY_RATE_HMAC_KEY_B64URL | Same encoding/minimum; decoded value must differ from the JWT key |
| IDENTITY_ALLOWED_ORIGINS | Exact comma-separated origins. Development defaults to http://localhost:5173 and http://127.0.0.1:5173; test supplies explicit fixtures; production requires explicit HTTPS origins; no wildcard |
| IDENTITY_TRUST_PROXY_CIDRS | Default empty/false, ignoring forwarded IP headers. Optional explicit trusted CIDRs only; reject blanket0.0.0.0/0, ::/0, arbitrary booleantrue or numeric hop count |

Process NODE_ENV/HOST/PORT stays as TASK-003. Load auth secrets in a separate nonserialized config, not the public process-settings object. Dev/test/Production use different keys. Examples contain deliberately invalid replacement markers, never usable credentials. Automated tests create synthetic keys in memory; no request to paste private keys into chat.

Validate configuration before connection/bind. Connect only to the supplied Identity database with automatic collection/index creation disabled and3second server-selection timeout. Require the approved collections/indexes to exist and match before serving auth; do not silently create/drop/rebuild indexes in Production. Tests explicitly prepare them only in guarded disposable Mongo. A local-only index setup command can be implemented with explicit target checks, refusing production; Production migration remains separately reviewed work.

Proxy safety is an explicit deployment gate: Render forwarding behavior and trusted source ranges must be verified before public auth deployment. Empty trust is safe against forged headers but can group traffic under a proxy address; do not claim accurate per-user IP rate limits behind an unverified proxy. No guessed Render CIDRs or security-setting change.

## HTTP contract

Business prefix remains `/api/v1`:

- POST `/api/v1/auth/register`: only fullName/email/password/confirmPassword; normalize name/email per D-017, preserve password bytes. Minimum15Unicode codepoints, maximum72UTF8bytes; confirmation exact. Server sets role Staff/status pending/authVersion0.201 `{data:{accountId,status:'pending'},requestId}`, no token/hash. Duplicate normalized email409 with safe generic `REGISTRATION_FAILED` / "Registration could not be completed".
- POST `/api/v1/auth/login`: only email/password. Nonempty password, maximum72UTF8bytes; the15character creation rule does not prevent a short wrong-password attempt from being counted as a login failure. Active accounts only. Unknown/wrong/pending/locked share401 `AUTHENTICATION_FAILED` / "Login could not be completed", without exposing account existence/state. Existing403for protected-resource authorization remains unchanged.
-200login payload per D-017: `{data:{accessToken,expiresIn:7200,account:{id,fullName,email,role,status}},requestId}`. Tokens stay client-memory only; no cookie/refresh or browser persistence introduced.
- Strict payload allowlist. Malformed JSON400, semantic validation422, body over16KiB413, rate429with Retry-After, DB/dependency failure503. Safe `{error:{code,message,requestId}}`; no input values/Zod/Mongo errors, request bodies or auth headers logged. UUID generated server-side; sensitive auth responses Cache-Control:no-store.

Use Express JSON parsing, existing Zod, official bcrypt cost12 and jose; no alternative hash library. For syntactically valid admitted logins, compare against the account hash or a nonaccount dummy cost12hash so an unknown account does not trivially skip bcrypt. This reduces a timing discrepancy; it is not a constant-time or enumeration-proof guarantee.

Exact origin CORS on auth endpoints, no credentials flag. Disallowed Origin returns403; requests without Origin remain usable by server clients/tests. Preflight allows POST/OPTIONS and Content-Type/Authorization headers. CORS is not authentication and does not stop nonbrowser clients.

## JWT

- HS256 allowlist only. Claims: sub=StaffAccount ObjectId string, authVersion integer≥0, iat, exp=iat+7200seconds, iss=`vinlook-identity:<NODE_ENV>`, aud=`vinlook-staff:<NODE_ENV>`.
- Server time in UTC seconds, no extra clock-tolerance window. Reject missing/malformed sub/authVersion, wrong issuer/audience/algorithm or expired token in the verification helper.
- No role claim used as authorization truth. Current DB status/authVersion and per-request RBAC are TASK-006; a cryptographically valid token alone does not authorize business operations. Do not implement fake /me/internal-authorize protection in this task.

## Durable rate semantics

- Fixed windows aligned to UTC epoch: login900seconds, register3600seconds. HMAC-SHA256 lowercase hex over an unambiguous JSON tuple `[operation,scope,normalizedValue]`; scope differentiates account from IP. Never store raw account/IP inside AuthRateLimit.
- Login IP budget30requests/window; registration IP budget5requests/window. Count requests reaching the auth route, including malformed/invalid payloads, before body validation/bcrypt. Rejected CORS preflight is not an admitted auth attempt.
- Login account budget5failed attempts/window. Normalize email first; precheck already-exhausted window, then compare. Unknown/wrong/pending/locked results atomically consume a failure slot. Only five failures receive401; a later or losing concurrent attempt receives429. No new pending/inflight schema field. Successful login does not erase prior failures; this is failed-attempt budget, not a consecutive-failure reset policy.
- Enforce counters with conditional atomic updates and unique(key,windowStart); handle initial-insert duplicate races with at most3bounded application retries, otherwise503. Compute Retry-After as remaining whole seconds rounded up, minimum1. Check timestamps/window in logic; TTL deletion timing never grants permission. DB unavailability fails closed503, no in-memory fallback.
- Apply limits before expensive work where possible. Concurrent in-flight requests are not forcibly cancelled when another request exhausts a limit; no stronger cancellation promise is made. Wrong/missing input errors do not echo values. No fixed lock or staff account-state mutation from rate limiting.

## Evidence and limits

Guarded disposable local Mongo replica set only; no Atlas or actual account provisioning. Tests cover strict/Unicode/byte/confirmation validation, normalized duplicate signup, pending/locked/active paths, actual cost12hash/compare, response redaction, JWT claims/expiry/issuer/audience/algorithm, forged forwarding headers, rate-window/concurrency behavior, restart-persistent counters and503dependency errors. Measure bcrypt sample times; don't silently lower cost. Fixtures create active Staff only inside test setup; no production approval bypass.

Keep minimal readiness503 until remaining authorization and actual deployment/dependency gates are implemented; a local auth test is not hosted readiness. No frontend login UI, Manager bootstrap, password recovery, RBAC business protection, Docker product deployment or CI/CD here. Open review PR after actual checks, Tú reviews. A closed Issue alone is not Done.

## Decision

Approve A together (environment names/encoding, status/error choices, JWT issuer/audience/claims, fixed-window semantics, CORS/proxy and explicit index gate), or specify changes. No TASK-005 code written yet. Approval does not require sharing real credentials or allow paid resources/production DB mutations.

Approval recorded: Duy approved A on 23 October 2026. The preceding proposal text is retained as history; implementation proceeds under this contract.
