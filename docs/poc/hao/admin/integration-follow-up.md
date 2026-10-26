# Admin integration follow-up — Issue 77

This change protects the existing Admin A screen against responses arriving after sign-out and adds explicit dispatch for the existing Gemini queue endpoint. It does not close Issue 77 or certify live acceptance.

## Behavior

- Signing out clears the in-memory state immediately. Old login, authority, content and job responses cannot restore it or clear the busy indicator of a newer operation.
- A second operation while busy rejects instead of reporting success and causing the caller to clear unsaved edits.
- Content reads clear jobs from the previously loaded revision.
- Queueing a locale and dispatching Gemini are separate actions. Dispatch requires confirmation that the next eligible job is system-wide, may concern another POI and may consume quota. It does not start MMS workers.
- Unknown provider outcomes remain blocked from the ordinary retry button; operator reconciliation remains necessary. There are no automatic retries or provider calls on load.

## Validation

32 web unit tests pass, including late-login/logout, late-content-read, busy mutation and authority-before-write races. Two isolated Chrome Staff/Manager tests pass, including cancel/confirm dispatch, conflict input preservation and blocked publication without 16 reviewed languages. Workspace build and production fixture scan pass. Browser persistence and network responses are labelled synthetic; no hosted account, Atlas write, upload or provider call was used.

## Review and remaining acceptance

Duy reviews this PR into codex/poc-demo; merging it does not close Issue 77. Verify the deployed Staff origins/CORS, actual upload and pipeline states, all 16 language reviews and publication end-to-end with approved live data before accepting the entire issue. The existing screen opens POIs by ID; no unsupported catalog-list endpoint is assumed.
