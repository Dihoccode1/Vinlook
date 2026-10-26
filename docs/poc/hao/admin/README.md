# POC-HAO-02 — Admin A implementation slice

Refs #77. Branch `codex/poc-hao-02-admin` from integration `bca97f2`; Duy alone reviews/merges. No live acceptance or Issue completion claimed.

English `/staff/*` uses explicit `VITE_IDENTITY_ORIGIN` / `VITE_CONTENT_ORIGIN`; missing configuration reports unavailable. JWT exists only inside the adapter closure. Login does not open a session. Mutation refreshes `/me`, checks a current open session, and backend remains the authority. Reload logs out. No Manager setup, recovery, account management or delete/restore UI.

Implemented against current router/validation: explicit open/reopen/close work session; create POI/draft-from-published/read by ID/save expectedEditVersion; marker and entrance coordinates; thumbnail intent + multipart upload + verified asset attachment; selected exact locale text/review/audio; explicit Process/jobs/retry; submit/return/publish with backend full16gate and current published revision. Staff has no Publish control. Unknown provider outcome is never auto-resent. Mutation idempotency keys remain in tab memory for an unchanged retry; no automatic mutation retry.

409 retains the form and original version, blocks further mutation until explicit reload.401 clears principal/input;403/session closed keeps input. Unsaved input prompts before unload/discard. Admin POI list is not implemented server-side: open existing POI by ID rather than inventing a route. No live environment/secret/provider/Atlas operation was performed.

## Actual tests

- `node --test tests/poc-web/admin/admin.test.mjs`:4passed; exact vi/zh-Hant paths, versions/idempotency/multipart/no auto-session,409/401/403 preservation, save/readback, partial/quota jobs,16locale preflight.
- `node --test tests/poc-web/admin/browser.test.mjs`:2passed on installed Chrome with synthetic transport. Explicit session required, create/readback, Staff cannot publish,409 input preserved, reload logs out. Screenshot `.bootstrap-review/poc-hao-admin-conflict-mobile.png` visually inspected.
- Existing adapter/lifecycle units:12passed. Workspace build completed successfully. Docker engine check failed separately; no real Mongo/backend integration was run.
- Initial browser runs failed because the local listener was absent and then a fixture variable shadowed the DOM `document`; fixed and final test passed. These failures are not counted as passes.

## Reproduce

Use portable Node24.18.1/npm11.16.0 as in Tourist handoff. `npm run dev --workspace=@vinlook/web -- --port 5174`; open `/test/admin-fixture.html` for **labelled local fixture only** (any synthetic email/password). Normal `/staff` uses real configured origins and never selects a fixture. No env values are provided here. Browser test uses existing `VINLOOK_PLAYWRIGHT_MODULE_PATH` and loopback `VINLOOK_UI_TEST_ORIGIN`; no dependency added.

5–7min demo protocol: sign in → show closed session/read-only → open session → create/readback → edit/save/version → conflict keeps input → exact locale review/asset → jobs status → Staff no Publish → Manager missing16 blocked → close/reload logs out. Only executed steps above are PASS; remaining steps require further browser/real-backend evidence.

## Still pending

Follow-up: unsaved metadata and unsaved locale text now block unrelated Process/review/submit/publish/upload actions and locale switching until explicitly saved/discarded. Added upload-status/reconciliation/verified-asset attachment controls without auto-resending uncertain uploads. Final browser suite:2passed, including Manager missing16 blocked and dirty metadata preserved; initial exact-label selector failed and was corrected without weakening assertions. Actual backend upload/reconcile behavior still requires disposable integration.

Real disposable Mongo + Identity/Content persistence/RBAC integration; actual verified thumbnail/audio/provider-free media fixtures; full Manager browser review/submit/return/publish workflow, full backend reconciliation of uncertain uploads, device/keyboard/expiry/timeout testing. Process/retry/upload/publish are user-triggered product actions; the agent has not executed them live. Docker Desktop must be running before guarded backend integration. Current implementation is reviewable, not full #77 acceptance.
