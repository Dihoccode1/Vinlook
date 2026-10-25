# TASK025 Content bootstrap regression fix

25 October 2026 UTC+7. Follow-up to merged PR #57; relates to Issue #52.

## Finding and change

Tú (ngoctu0405) submitted CHANGES_REQUESTED review 5641660424 on PR #57. At inspection, PR #57 was merged with its original head 6e14e54f49358a322c398350644ead96946fa800; no corrective commit was present. The review identified a valid P1: the Content image disabled Gemini but defined adapter-only FFmpeg path variables. loadContentConfig invokes loadAdapterConfig, which correctly rejects adapter configuration while disabled. The real default server therefore could not start. The old packaging smoke imported createApp directly and missed the bootstrap failure.

Remove the two adapter path defaults from the Content image. Keep the disabled-configuration guard and the installed pinned FFmpeg binaries unchanged. Extend the existing image smoke to invoke the production configuration loader and actual default Content CMD. Identity retains its packaging-only createApp smoke because its entrypoint needs private DB configuration.

## Local verification

- New regression check against the original vinlook-content:task025 image failed with Invalid Gemini adapter configuration under Node v24.18.1.
- Rebuilt vinlook-content:task025-fix successfully. Image ID: sha256:428fc50eb0b7b304c20c797486a2d6935cd9e4ae891517509849612fd7f69d8f.
- Fixed Content image passed configuration loading, real default server startup, nonroot/read-only/no-network smoke, liveness 200 and readiness 503 DEPENDENCIES_UNVERIFIED.
- Pinned Linux FFmpeg converted a real synthetic 90-second PCM fixture: MP3 90.048 seconds, 720428 bytes; independently parsed mono output passed.
- Identity image passed the updated shared smoke helper.
- node --check scripts/ci-image-smoke.mjs passed.

Transient connection refusals during bounded startup polling are retried; both completed smokes exited 0. No database, provider, media upload or deployment was used. Full disposable integration suites and production image checks run again in the follow-up PR CI; their result must be inspected at its exact head before merge.

## Remaining gates

This fixes packaging bootstrap, not live dependency readiness. Request Tú review of the corrective PR and merge after successful CI. Keep deployment blocked until that correction lands. TASK025 remains open with 0/80 final text/audio pairs; prior CI success for PR #57 did not establish real Content bootstrap correctness.
