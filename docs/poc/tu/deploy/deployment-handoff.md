# TU05 live handoff — preparation only

Refs #75; D008/014/019 and PoC review rules. This is a checklist for a later exact
approved release, **not authority to deploy**. No Usage service/account/database,
secret, hosting entry or traffic/load is created by the CI/image slice.

## Before asking Duy for a concrete live decision

1. TU01 bridge decisions and TU02 business implementation must be reviewed and
   integrated. Inventory exact integration SHA, workflow/check conclusions and
   actual Usage startup requirements. The image in this slice is health-only;
   deploying it would not provide monitoring or meet #75.
2. List exact target Usage Render service/account/region/free tier and current
   resource/usage limits; verify them at deployment time. Do not infer present
   account limits from historical D008 examples or pre-create a paid service.
3. List exact frontend HTTPS origins (Hạo/Duy owns them), Identity origin/caller
   configuration and the Usage-owned database/catalog plan. No wildcard CORS,
   gateway, cross-DB credential, keepalive or copied Content caller key.
4. Existing consumed names: NODE_ENV, HOST, PORT; authorization adapter names
   IDENTITY_BASE_URL and USAGE_IDENTITY_SERVICE_KEY_B64URL. Identity's matching
   IDENTITY_USAGE_SERVICE_KEY_B64URL remains private and server-side. Any proposed
   USAGE_MONGODB_URI/USAGE_ALLOWED_ORIGINS/CONTENT_BASE_URL from PR83 is pending,
   not a newly consumed variable in this slice. Never put real values in Git/chat.
5. Present approved catalog read-only preflight and exact missing operations before
   any write. No fixture catalog apply, automatic model/index creation, seed or
   Manager recreation on Atlas. Determine backup/restore-trial evidence under D014
   and the approved maintenance plan before shared changes; don't run it here.
6. Prepare exact image/reviewed SHA deploy plan, existing known-good rollback SHA,
   startup/config compatibility and safe smoke expectations. Duy authorizes the
   concrete shared environment/configuration changes. User enters private values
   directly. No automatic deploy just because a PR/CI succeeded.

## Release and rollback evidence to collect later

- Track actual platform deployment ID/commit/status; a hook response is not Live.
  Liveness200 is not readiness. Keep baseline DEPENDENCIES_UNVERIFIED visible until
  a separately approved readiness contract is implemented and proven.
- Verify unauthenticated monitoring denial, authorized active Staff/Manager with no
  open session requirement, locked-account denial, real telemetry/multitab and
  independent devices with controlled 90s freshness. Do not use fixture tokens.
- Record exact origins/CORS and private caller-key match as safe outcomes, never
  keys/hash/URI/token/driver bodies. No credentials delivered to browser builds.
- Roll code back to the approved prior SHA only after compatibility inspection;
  rerun safe checks. Code rollback never implies automatic database restore or
  destructive catalog repair. Preserve failed receipts/data for diagnosis. Actual
  rollback/restore testing remains NOT RUN until authorized and observed.
- Static graph/package hosting requires measured complete artifact size and actual
  free-host Range/CORS/cache/immutable-path checks after TU04; this image does not
  store graph/audio on Render's temporary filesystem or select a replacement host.

## Load/cold-start plan is gated separately

Submit exact owned target paths/methods, request payloads, concurrency stages,
duration/request budget, stop conditions and free-tier allowance to Duy before
execution. No public provider/TTS/generation/upload traffic or third-party load.
Use at least the approved D019 sample count/methodology for product claims; record
all failures/timeouts and actual p95, warm/cold/device/network conditions. Avoid
warming a service in secret and calling the result cold. Offline/download/route/
audio latency have separate end-to-end client evidence; HTTP timing is insufficient.

Increasing to 50 visitors depends on approved budget and real measurements. No
claim of support50, backend readiness, observed cold-start time or verified rollback
is made here. Hạo handles honest UI timestamps/stale/loading states; this checklist
does not modify the frontend. Only Duy signs final #75 acceptance/closure.
