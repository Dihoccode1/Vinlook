# TU03 read-only Content HTTP adapter

Refs #73. `scripts/poc/content/read-only-http.mjs` exports
`createReadOnlyContentAdapter({origin, accessToken, timeoutMs?, maxJsonBytes?})`.
Construction performs no I/O. The caller explicitly supplies the canonical HTTPS
origin and an existing JWT in memory; the module never logs in, reads environment
variables, persists credentials or creates a work session. No CLI command invokes
it. Backend Staff/Manager authorization still applies to each read.

The frozen adapter exposes only these reads plus `origin` and `close()`:

| Method | Existing Content endpoint |
| --- | --- |
| `readPoi(poiId, {signal}?)` | GET `/api/v1/admin/pois/:id` |
| `readJob(jobId, {signal}?)` | GET `/api/v1/admin/jobs/:id` |
| `listJobs(revisionId, {signal}?)` | GET `/api/v1/admin/jobs?revisionId=:id` |

IDs must be lowercase 24-character hexadecimal strings. No generic method/path
escape hatch, POST, claim, dispatch, retry, provider or upload operation exists.
This object cannot satisfy the mutating `runOnce` transport interface. Its private
`{status:200, body}` readbacks can feed planning or manual reconciliation; do not
print or commit them. Mapping editorial POI references to real database IDs and
approving any later mutation remain separate operator decisions.

Each client permits one in-flight request. Defaults are a 15-second whole-request
deadline and an 8MiB JSON cap; callers can lower either bound. The byte cap applies
to the decompressed streamed body as well as a declared Content-Length. Calls use
GET, no body/cookies/referrer, no-store and manual redirects. A redirect is rejected
before another origin can receive the Authorization header. No application retry
or polling occurs. Caller cancellation, timeout and `close()` abort active I/O;
close also drops the adapter's token reference and rejects later reads. JavaScript
does not guarantee erasure of string memory or copies owned by the caller.

Success requires JSON/UTF-8, the existing data/requestId envelope, valid consumed
POI/revision/locale/version fields and job safe DTO shape. POI/revision IDs are
bound to the requested POI; localized rows bind to the selected working/published
revision without duplicates. Read-only POI inspection permits in_review/published
and deleted records; mutation admission belongs to the planner/backend. Job lists
bind to the requested revision, contain at most 1000 rows and strictly increasing
unique IDs, matching the existing service's all-or-error list behavior. This is
transport/shape validation, not text quality, audio freshness or human acceptance.

`ContentReadFailure` exposes fixed codes, a bounded status and optional numeric
Retry-After seconds (429 only, at most 3600). Raw response/error bodies, Location,
request IDs and transport causes never appear in errors. The caller must stop or
make a separate explicit decision; Retry-After does not schedule another request.

## Executed test boundary

`node --test scripts/poc/content/test/read-only-http.test.mjs` exercises real Node
fetch/HTTP streaming against temporary servers bound to 127.0.0.1. A trusted test
injection maps the synthetic HTTPS origin to those servers. Production has no
HTTP-origin option, TLS bypass or fixture fallback. These tests do not verify a
real TLS handshake, deployed ingress, login, RBAC, database or Content runtime.

Ten tests cover the three routes, identity binding, invalid inputs, redirect with
a second server receiving zero requests, redacted 401/403/404/429/503 failures,
timeouts before headers and during streams, cancellation/close/single flight,
declared/chunked byte limits, malformed JSON/UTF-8, DTO/list checks and safe handling
of transport errors or an injected fetch that ignores abort. The previous 22
CLI/inventory/runner tests remain part of the combined suite. See
[verification.md](verification.md) for actual results and live gaps.
