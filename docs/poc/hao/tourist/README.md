# POC-HAO-01 — first independent slice

26 October 2026, Asia/Saigon. Refs #76. Owner Hạo / 2107h06; Duy / Dihoccode1 is the human reviewer and only merger. **Issue NOT DONE; fixture/module evidence only.**

## Scope and sources

Issue #76 and tracker #81 were read using the in-app browser. Both were open and showed assignment activity only, with no comments at observation time. #76 has no GitHub parent relationship; #81 is its documented tracker. The in-app GitHub session was signed out, so the start comment/questions/PR could not be submitted. See `github-drafts.md`; those drafts have NOT been sent.

Read PoC README/TRACEABILITY/CONTRACTS/REVIEW-AND-ACCEPTANCE plus START-HERE/ISSUES; requirements and relevant tourist/telemetry stories/use cases, design readiness, D006/D015/D017, UCD001/002, TASK014 public contract and implementation evidence, TASK020 locale contract and verification, public Content router/validation/service, Identity auth/authorization routes and existing locale provider/registry. Historical proposal text is interpreted using the appended approvals and current implemented contracts. No baseline file is changed.

Initial workspace: `C:\Users\ADMIN\Documents\Vinlook-PoC`, origin `https://github.com/Dihoccode1/Vinlook.git`, branch `codex/poc-hao-01-tourist`, clean working tree, seed HEAD `f8058292169d994ae75116b078e3103cded34018` matching the locally available `origin/codex/poc-demo`. No AGENTS.md was found in the repo or checked ancestor paths. No reset/clean/stash/reclone was used.

Only Hạo-owned paths: `apps/web/src/adapters/**`, `apps/web/src/tourist/**`, `apps/web/test/tourist-fixture.*`, `apps/web/vite.config.js`, `tests/poc-web/**`, `docs/poc/hao/tourist/**`, `.github/workflows/poc-web.yml`. No backend, shared contract, baseline, root package/lock, dependency, data/graph or shared env modification.

## Implemented

- Separate Identity/Content transport factories, public-origin validation, central safe error mapping, omitted credentials/no-store, timeout/cancellation. Content uses only public list/detail/nearby, exact locale and strict public DTO projection; never accesses admin/draft endpoints. Nearby requests max4, validates radius3000 and refuses oversized/out-of-bounds results. Server retains publication authority; client validation is not a substitute for gate16locale.
- Identity stores JWT only in a closure, drops it on logout or current-authority401/403; login/me adapter only, no Admin screen or Manager setup.
- BrowserId UUID in telemetry-only localStorage with Web Locks race coordination; denied storage/first-use missing coordination falls back to stable memory with `best-effort` disposition. Existing stored ID remains reusable. Browser profiles/private modes are not physical-device identity.
- Usage semantic injection only: presence/start/heartbeat/end,30s schedule, pause keeps playback, captured replaced/end identity, offline epochs drop pending events, reconnect admits only current playback, best-effort unload and timeout fallback owned by backend. No Usage HTTP bridge is invented/enabled.
- One media controller per tab: no autoplay; pause/resume same playback; close/replaced/completed/page_closed; locale transition stops old audio and requires another Play. Async media/telemetry errors cannot block reading.
- Separate labelled dev fixture page with15 synthetic DTOs,16 locale-specific asset URLs, search/empty/error/GPS-denied/POI-sheet/mini-player interactions. There is no real map, image/narration or package in this fixture. Native audio URLs intentionally fail; browser lifecycle tests explicitly inject a media double. No fixture is imported by the production entry; build rejects `VITE_POC_FIXTURE`.
- CI definition for unit/build/scaffold/fixture guard, read permissions, existing pinned official actions, PR base `codex/poc-demo`. Browser tests are local only; no new test dependency or download. Workflow has not run on GitHub.

## Runtime and reproduction

Git2.53.0.windows.3. PATH initially selected bundled Node24.22.1 and had no npm. Downloaded the portable official Node24.18.1 Windows x64 ZIP into ignored `.tools/`, verified SHA256 against `https://nodejs.org/dist/v24.18.1/SHASUMS256.txt`:

`ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765`.

The archive bundles npm11.16.0; both exact versions were executed and verified. No global install/PATH persistence, pin or lock change. In PowerShell from repo root:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.18.1-win-x64') + ';' + $env:PATH
node --version
npm.cmd --version
npm.cmd ci --no-audit --no-fund
npm.cmd run build
npm.cmd run check:scaffold
node --test tests/poc-web/adapters.test.mjs tests/poc-web/lifecycle.test.mjs
npm.cmd run test:ui-locale
npm.cmd run dev --workspace=@vinlook/web -- --port 5174
```

Visit `http://127.0.0.1:5174/test/tourist-fixture.html`. Normal `/` remains the existing preview; this slice does not present a finished Tourist product. Stop dev with Ctrl+C.

Browser tests reuse installed Playwright and installed Chrome in isolated profiles; no real login profile:

```powershell
$env:VINLOOK_PLAYWRIGHT_MODULE_PATH = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:VINLOOK_UI_TEST_ORIGIN = 'http://127.0.0.1:5174'
node --test tests/poc-web/browser.test.mjs
```

Optional PUBLIC configuration names for subsequent integration: `VITE_IDENTITY_ORIGIN`, `VITE_CONTENT_ORIGIN`, `VITE_USAGE_ORIGIN`; no values have been configured or read. `VITE_POC_FIXTURE=labelled-local` is a dev-only guard and causes build failure. The separate dev HTML fixture does not require an env file. There are no worker/service keys in frontend code.

## Evidence actually executed

- `npm ci --no-audit --no-fund`: exit0,154 packages. npm warned that bcrypt's install script was not allowlisted. No blanket script approval; build/scaffold passed, but native bcrypt/DB auth integration is NOT verified by these checks.
- Full `npm run build`: exit0. Existing UI manifest16locales/51keys, human review still pending.
- `npm run check:scaffold`: initial sandbox EACCES to loopback; rerun with loopback permission exit0,3 independent HTTP listeners; no DB/provider calls.
- New adapter/lifecycle units:12/12 pass, no skips.
- New Chrome browser fixture tests:4/4 pass, no skips. Actual concurrent two-tab Web Locks and distinct browser context; search/GPS denial/empty/error, mobile390/laptop1280/RTL overflow; no autoplay, all16distinct fixture asset URLs; media double lifecycle; native audio failure with external requests aborted.
- Existing locale units:5/5 pass. No new native-language review is claimed.
- Fixture-flag production build: expected exit1 with `FIXTURE_FORBIDDEN`, verified explicitly; normal build succeeds without flag. No fixture marker/test API in generated production assets.
- `git diff --check` and unchanged root package/lock checks passed. Ignored screenshots `.bootstrap-review/poc-hao-01-fixture-390.png` and `...-1280.png` were visually inspected; these show the labelled fixture, not a live map.
- Initial browser run could not reach the sandboxed Vite listener:2 failures. After moving the test listener to permitted loopback5174, the final4-test run passed. Earlier/repeated runs are not extra unique passes.

Exact final commit is supplied in the handoff message (`git rev-parse HEAD`); no self-referential commit SHA is embedded in this source file. All checks above concern this independent slice, not full Issue acceptance. No GitHub CI/review/merge/live result is inferred.

## Remaining / handoff

- Duy must approve MapLibre/PMTiles exact pins/shared-lock integration. Public registry currently reports maplibre-gl6.16.0 and pmtiles4.5.0, both BSD-3-Clause; these are candidates, NOT installed or accepted compatibility decisions. Real PMTiles artifact/style/license attribution and15published POIs/240approved text/audio pairs still required.
- Duy/Tú must finalize Usage HTTP response/perPOI/CORS/limits/schema bridge. Current telemetry is semantic fixture only. No real counting/90s expiry test is claimed.
- Tourist production screen/routes/map, complete selected-locale fetching/pagination and state coordination, nearby boundary/order and real media integration remain for the following UI slice. No English offline package/navigation acceptance, phone hardware/Safari/autoplay/load/cold-start acceptance, deployment or live mutation was performed.
- Docker CLI29.9.1/Compose5.6.0 present; Docker Desktop Linux engine pipe absent. User should open Docker Desktop, wait for Running, select Linux containers if necessary, then run `docker version` and `docker info`. This slice did not use Mongo and does not require Docker.
- GitHub app browser login required to send start/questions and open PR base `codex/poc-demo`, `Refs #76`, reviewer `Dihoccode1`. Do not tick Issue-wide implementation/AC boxes for this partial slice. No Issue is closed and no merge is authorized.
