# Gemini adapters (TASK-017)

Disabled until `CONTENT_GEMINI_ENABLED=true` plus the complete `.env.example` settings, existing Content/Identity/media configuration, reviewed free-project caps, binaries and owned collection/index catalog are supplied. No automatic migrations, credential discovery, billing check or project provisioning. Confirmation expires after seven days; review limits before renewing it. Caps are conservative local request controls, not a promise that a Google project remains free. Standard requests only; no model/key/paid fallback or automatic provider retries.

`hybrid-v1.json` is the immutable registry source for processing and publication: fifteen translations, four Gemini/Kore audio profiles and twelve exact MMS revisions. TASK018 must consume the same registry. Updating a model, style, revision or conversion profile requires a new reviewed registry version. Existing rows are not relabelled or migrated.

Authenticated Staff/Manager with an open work session can POST strict `{}` to `/api/v1/admin/jobs/run-next`, using a UUID Idempotency-Key. One job runs asynchronously in Content; a repeat key within 24 hours returns the same admission and does not restart it. No eligible job returns 200 with null IDs. Another explicit request advances the queue. The global singleton lease and process slot exclude concurrent adapter execution. This prototype does not contain a permanent daemon or Render wake-up loop.

`provider_calls` uniquely identifies job/retry cycles and records dispatch before sending a single POST. `provider_controls` holds execution fencing, per-model quota counters and admission replay. Both are strict owned collections, without TTL or startup provisioning. One process exit can lose in-memory audio. A dispatched record found by a reclaimed job is quarantined, never automatically sent again; completion persists job/result/translation/ledger/audit in the same transaction. Admission and controls do not grant publication authority.

Admin job reads expose safe `PROVIDER_OUTCOME_UNKNOWN`. Retry then requires `{expectedEditVersion,acknowledgeProviderResend:true}` plus existing authorization and idempotency key. A retry can duplicate provider computation and consume another quota reservation. Other failures use the existing retry shape. Local or provider quota exhaustion produces waiting_quota; provider 429 sets at least a 60-second cooldown. Counters use UTC day buckets, fixed minute counts and minimum spacing; Google's quota may reset differently. No counter refund for an uncertain request. Dispatched events from a stale/manual-edited draft remain durable even when output admission fails.

Audio remains private in memory until validated MP3 goes through TASK019's existing intent/upload/verification flow. Store intent ID before upload. Lost upload acknowledgement is reconciled without repeating synthesis. A verified media intent may only attach to its original live attempt. Reclaim changes the attempt: the previous intent is not adopted; unknown outcome requires human handling. No unverified output or generated translation is auto-approved/published.

Transport permits only fixed Google HTTPS routes, header credentials, bounded single responses, no redirect. TTS uses nonstreaming Interactions with store:false; translation uses generateContent structured JSON. No tools, provider error bodies or raw text are logged. Child FFmpeg uses an argument array, restricted pipe input, bounded stdout/stderr, one thread, deadline and an environment without cloud credentials. FFprobe and TASK019 independently verify MP3 shape/duration. 150 seconds of PCM may exceed the final 150-second MP3 bound because of encoder frame padding; reject it rather than cropping/speeding narration.

## Isolated verification

`npm run test:adapters` runs units; `npm run build` includes adapter syntax checks. Database suite reuses the guarded TASK016 HTTP/Identity fixture with TASK017-labelled Mongo container: set `VINLOOK_TEST_ADAPTERS=1`, `VINLOOK_TEST_MONGO_CONTAINER=vinlook-task017-mongo-<unique>`, exact approved Mongo digest, replica set `vinlook_task017`, loopback-only dynamic port, fresh empty test databases. Then `npm run test:adapters:db`. It intentionally refuses non-fixture Mongo targets and runs job regressions as well. No actual provider is called.

Pinned Linux smoke recipe (Linux amd64; Docker required):

```
docker build --platform linux/amd64 -f services/content/Dockerfile.ffmpeg-test -t vinlook-task017-ffmpeg:verified services/content
docker run --rm --network none --mount type=bind,source=<absolute-workspace>,target=/work,readonly vinlook-task017-ffmpeg:verified node --test services/content/test/adapters.ffmpeg.test.js
```

This is a converter/CI smoke recipe, not a production Docker deployment or automatic GitHub workflow. `ffmpeg-lock.json` records resolved base digest and Debian package checksum. The build checks the exact package, and runtime checks versions/encoder capability. Debian transitive libraries remain signed-APT-resolved rather than fully reproducible lock artifacts. No Windows tools installed.

Actual Gemini account/key/quota, full narration/locale quality, actual media delivery, local MMS worker, Render resource/cold start and end-to-end offline/load checks remain separate release gates. `/health/ready` remains 503. A fixture pass does not satisfy them.
