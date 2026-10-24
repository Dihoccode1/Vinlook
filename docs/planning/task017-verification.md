# TASK-017 isolated verification — 24 October 2026

Approved detailed contract: task017-adapter-contract.md. Owner Tú / reviewer Duy retained. No real account secrets/provider calls, Atlas mutations, Cloudinary uploads, model downloads or Render deployment in this task.

155 unique relevant passed test groups, zero failures in final runs:

| Final run | Passed |
|---|---:|
| Content schema/durability/draft/media/publication/lifecycle/job/adapter units plus runtime/auth | 66 |
| Guarded Mongo/Identity/HTTP adapter integration, including original job suite | 26 |
| Draft Mongo regression | 14 |
| Publication Mongo regression | 16 |
| Lifecycle Mongo regression | 17 |
| Media Mongo regression | 15 |
| Real pinned Linux FFmpeg synthetic conversion smoke | 1 |

Full workspace build exit 0. `/health/ready` remains 503 by design; health behavior included in the runtime suite. Earlier 22-group run overlaps the final 26 and is not added. Early failing fixture/build runs are not counted as passes. Their findings were fixed: APT epoch-encoded download filename, base64 regex stack exhaustion on full audio, immutable-default Mongoose hydration and synthetic audio setup. Temporary raw diagnostic logging was removed before the final runs.

Adapter checks include: one frozen processing/publication registry; translation-to-audio and atomic completion ledger/outbox; admission replay; global execution exclusion; restart/reclaim dispatch quarantine; explicit resend acknowledgement; 429/manual retry and local daily caps; stale human text; existing MP3 attachment; lost Cloudinary acknowledgement reconciled without another Gemini call; outbox failure leaves dispatch durable and content rolled back; disabled/stale activation; strict bounded provider JSON/audio and child environment/abort limits. Fixtures use only loopback synthetic provider routes.

Linux smoke used recorded Node 24.18.1 digest and FFmpeg 7:7.1.5-0+deb13u1 package SHA256 in services/content/ffmpeg-lock.json. Synthetic 90-second mono 24kHz WAV produced MP3 90.048 seconds, 720428 bytes. Conversion and independent metadata parse took approximately 990 ms; observed Node RSS 112988160 bytes. Disposable container had network disabled and read-only workspace. These values are local smoke observations, not Render memory/CPU/concurrency/latency acceptance. Encoder padding is checked against final MP3 limits rather than cropped away.

Nine dedicated fresh Mongo fixture containers were used across failed, corrected and regression runs. Each guarded by exact image digest, task label, loopback dynamic port and empty owned test databases. Cleanup requires exact ID/label/volume-only mount verification; no Docker prune or unrelated container removal. Cached converter test image may remain for reproducible review.

Pending separate gates: human Duy review/user merge; actual free-project/quota/secret setup and full translation/narration quality; TASK018 MMS worker; real media/Render/end-to-end/offline/load acceptance; TASK010 native operator acceptance. No formal human review inferred from these automated checks. GitHub workflow execution is not claimed; the checked-in disposable Docker/Node recipe is available for later CI wiring.

Final review strengthened in-memory dispatched-state tracking so a failed recovery read cannot downgrade an uncertain call to a normal failure. Three focused unknown/restart/outbox cases were rerun on a ninth fresh fixture; these overlap the 155 unique groups.

Cleanup completed: all nine fixture containers and their own anonymous volumes removed after exact ID/task-label/image/volume-only checks; no unrelated Docker state removed.
