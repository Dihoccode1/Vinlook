# Content → Usage jobs bridge

Refs #71. Duy approved implementation/testing of job counts only. Worker remains
unknown: active/renewed leases are not reliable idle-heartbeat proof and can also
be extended by Manager recovery.

Content GET `/api/v1/internal/monitoring/jobs-summary` returns `{data:{asOf,counts},requestId}`.
Counts cover queued/running/succeeded/failed/waiting_quota in one snapshot transaction,
3s transaction deadline, no cache or records. Missing job model/DB failure returns503.
One in-flight summary per Content process prevents overlapping expensive scans.
The route rejects Origin, JWT, body, query, wrong caller and wrong dedicated key.

Optional pair (values entered privately after reviewed deployment plan):
`CONTENT_USAGE_CALLER_KEY_B64URL` / `USAGE_CONTENT_CALLER_KEY_B64URL`.
Both must be canonical32byte base64url and differ from existing service/worker keys.
No secret is sent to the frontend. Unconfigured Usage keeps BRIDGE_PENDING.

Usage requests Content only on an authorized Monitoring jobs read, with its own
caller key, no cookies/JWT/redirect/retry. Deadline3s, decompressed JSON cap16KiB,
strict envelope and five nonnegative safe-integer counters. Samples older than30s
or over10s ahead are rejected. Dependency/shape failures return unavailable/null
counts, never fabricated zero; worker remains unchanged unknown. No background ping,
schema/index/dependency/retention change, cross-service DB access, or live action.

Verification: focused tests use synthetic counts and real loopback HTTP; they are
not proof of real Mongo snapshot behavior or hosted key pairing. Existing CI runs
Usage/Content regression separately. Duy reviews/merges; a later exact deployment
and private key-entry plan is needed before hosted activation.
