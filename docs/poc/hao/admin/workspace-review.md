# Admin workspace review — Issue 77

## Delivered

English content studio with a responsive sign-in screen, six anchor-linked workflow steps, visible account/session state, unsaved-input notice, loaded revision context, and an identified current narration player. The normal approve action is unavailable until source/audio are current and an audio URL exists. Approval asks the reviewer to attest to the exact locale, duration, textVersion and editVersion. This is a human confirmation, not an automatic listening-quality assessment; the backend remains authoritative.

No dependency, endpoint, database, provider policy or deployment configuration changes. No live requests were made. The workflow retains the existing 16-language publication gate and Staff/Manager permissions. No unimplemented catalog-list or monitoring link is presented.

## Five-to-seven-minute reviewer walkthrough

1. Run `npm run dev --workspace=@vinlook/web -- --host 127.0.0.1 --port 5176` from a clean clone after installing the locked dependencies. Open `/test/admin-fixture.html?review=1`. The yellow banner identifies the synthetic transport and persistence. Any valid email/password is synthetic input here; do not enter real credentials.
2. Sign in, observe the closed session and disabled edits. Open/reopen the session explicitly. Check mobile width (390px) and desktop width (1280px), keyboard focus and the six workflow anchors.
3. Enter a name and English source, create a draft, and observe the returned revision. Edit again to see the unsaved notice. The original conflict test separately proves preserved input on 409.
4. Select `vi`; inspect the text/version/current audio label. Cancel approval and verify there is no request. Confirm approval, then select `zh-Hant` and repeat. Browser tests assert the exact distinct locale paths and successive expected edit versions. Fixture audio is deliberately unavailable: this test proves UI request correctness, not listening acceptance.
5. Check queue-versus-dispatch guidance and cancel the explicit Gemini dispatch confirmation. Tests verify cancellation sends nothing and confirmation sends only once. These are synthetic requests, not provider calls.
6. In `/test/admin-fixture.html?role=Manager`, create a draft and confirm publication stays disabled without 16 current reviewed assets. Sign out/reload to see the sign-in screen again.

## Verification

- Workspace build passed; existing large map-chunk warning remains.
- 32 web unit tests passed.
- Three isolated Chrome browser tests passed, including Staff/Manager errors and exact vi/zh-Hant confirmation/cancellation; mobile document width does not exceed the viewport.
- Production artifact scan passed, excluding development fixture content.
- Local screenshots were visually inspected at `.bootstrap-review/issue77-workspace-mobile.png` and `.bootstrap-review/issue77-workspace-desktop.png` (ignored outputs, reproducible through the browser test).

Duy decides merge into `codex/poc-demo`. This PR does not close Issue 77: configured frontend CORS and approved live upload, job execution, language review and publication acceptance remain separate evidence.
