# Usage HTTP frontend integration — Issues 76/78

The merged Usage implementation now exposes the existing seven `/api/v1` route families. This slice maps the web semantic ports to those routes, without adding endpoints, schemas, dependencies, environment names or live settings.

## Operator configuration

Use the already-declared public `VITE_USAGE_ORIGIN` with the actual HTTPS Usage origin at build time, alongside `VITE_IDENTITY_ORIGIN` and `VITE_CONTENT_ORIGIN`. Do not put keys or tokens in VITE variables. No origin is invented or enabled by this PR. Usage must be deployed/configured with its own catalog and exact frontend CORS origin; missing/invalid Usage configuration leaves visitor telemetry unavailable and shows an explicit Monitoring configuration message while preserving Content tools.

Visitors use the existing browser identity/playback lifecycle through credential-free JSON presence/start/heartbeat/end requests. The adapter validates exact IDs/locales/end reasons, maps only approved fields, sends no GPS/JWT/cookie, and never retries automatically. Delivery during page close remains best effort; no keepalive guarantee or offline queue is introduced.

After Staff/Manager login, the Monitoring button uses the same in-memory token closure for fresh Identity authorization and the three Usage GETs. It does not open a work session or persist/copy the token into storage. Back to content retains unsaved local input. Sign out still confirms discarding input, and 401/403 during Monitoring clears the whole Staff workspace rather than exposing the previous draft on return. Leaving Monitoring unmounts its poller. Refresh remains 30 seconds while visible; no background Render keepalive.

## Verification and limits

41 web unit tests passed, including exact public wire fields, separate origins, missing-token rejection, no automatic retry and no automatic work session. Five isolated Chrome Admin/Monitor tests passed, including opening Monitoring before a work session and returning to sign-in after Usage403. Workspace build and production artifact scan passed. Final adapter tests were rerun after strict ID-length validation. All response values/account data in these tests are synthetic; no live provider, database or telemetry was called.

This connects the normal App telemetry port and exposes the production Staff Monitoring view, but does not certify deployed CORS, Mongo durability, actual visitor counts, media close delivery or phone acceptance. Global jobs/worker bridge remains unknown in the backend; the UI does not invent zero/up values. Keep Issues76/78 open for those remaining acceptance items. Duy reviews and decides merge into codex/poc-demo.
