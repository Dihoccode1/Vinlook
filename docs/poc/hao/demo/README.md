# POC-HAO-05 — release preparation, NOT READY

Refs #80. Duy reviews/merges/releases. No project, deploy hook, secret, provider request, paid feature or live environment was created/changed. No public URL or device/load/live AC claimed.

## CI and local commands

`poc-web.yml` triggers PR base codex/poc-demo and push all Hạo task branches; pinned official actions, exact Node24.18.1/npm11.16.0, locked install, recursively discovers lane unit tests, locale regression/build/scaffold and production fixture artifact scan. Browser suites are deliberately separated from Node units and must actually run with reviewed existing Playwright/Chrome tooling. No missing browser dependency is silently called PASS.

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.18.1-win-x64') + ';' + $env:PATH
node tests/poc-web/e2e/run-tests.mjs unit
npm.cmd run build
node tests/poc-web/e2e/check-build.mjs
# Start Vite separately on loopback5174, then:
$env:VINLOOK_PLAYWRIGHT_MODULE_PATH = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
$env:VINLOOK_UI_TEST_ORIGIN = 'http://127.0.0.1:5174'
node tests/poc-web/e2e/run-tests.mjs browser
# Fail-closed evidence completeness check, no deployment:
node tests/poc-web/e2e/release-gate.mjs <reviewed-evidence-file> <exact-merged-sha>
```

Runner detects files present on the checked-out SHA only. Pending Admin/Monitor/Offline PRs must be reviewed/merged and integrated before claiming one combined rehearsal. Browser CI provisioning/pin remains a Duy review item; current CI does not claim browser execution.

## Proposed hosting plan — not executed

Vercel Hobby project candidate `vinlook-poc-web`; proposed exact origin `https://vinlook-poc-web.vercel.app` **subject to availability/Duy approval**, not a deployed URL. Root Directory apps/web, Vite output dist, lockfile install from monorepo and exact reviewed merged codex/poc-demo SHA. `apps/web/vercel.json` provides static Vite build and staff deep-link rewrite only; it does not configure Git auto-deploy or authorize release. Duy must ensure hosting cannot bypass checks/gates. No arbitrary source push is authorized to deploy. Real immutable offline artifacts/hosting size/range limits must be measured before upload.

Frontend public configuration NAMES only: VITE_IDENTITY_ORIGIN, VITE_CONTENT_ORIGIN, VITE_USAGE_ORIGIN. Never service/worker/provider/DB keys. Duy/Tú approve exact candidate origin for all3backend CORS configs using their runbook; do not use wildcard CORS. No change here. Review current official [Vercel configuration](https://vercel.com/docs/project-configuration) and [limits](https://vercel.com/docs/limits) at release; no price/quota constant is changed or claimed.

## 5–7minute rehearsal protocol

1.0:00–1:00 guest map with15published POIs, search, correct thumbnail/text; choose16exact locales, sample actual distinct narration, no autoplay.
2.1:00–2:00 GPS permission/refusal, valid walking route, off-route reroute, no-GPS/no-route handling; no straight-line route.
3.2:00–3:00 complete English package/bytes/version, disable both network interfaces, close/reopen, map/search/audio/routing; corrupted update retains old package.
4.3:00–4:30 existing Staff login, closed session read-only, explicit open, draft save/readback/version409 preserve input; Manager full16review gate; no production provider mutation outside Duy's exact approved plan.
5.4:30–6:00 two real devices/browser identities, multitab one browser, Play/Pause/Resume/end/close,30s dashboard and90s expiry; force loss and retain stale last-known timestamp.
6.6:00–7:00 exact build SHA, device/network/warm-cold records, outstanding gates, backup/rollback evidence and Duy decision. A fallback recording must name its last verified SHA/date and be labelled recording, never live.

## Device evidence protocol / NOT RUN

Record exact merged SHA, URL, browser/OS/device (Android Chrome, iPhone Safari, laptop), UTC+7 time, network/warm-cold condition, expected/actual, screenshot/video link, fixture/live classification and operator/reviewer. Test actual GPS route, offline network-off+reopen and eviction/quota/update interruption; actual16locale narration90–150s and approved media versions. Negative auth/session/RBAC and raw console/network review must not expose passwords/tokens/keys in captured evidence.

50-user load only after Duy-approved exact environment/caps; >=100operations per measured action, errors/timeouts count against completion and p95. Do not treat50desktop contexts as50physical phones or fixture counters as real usage. Record cold separately. No load test run here.

## Current blockers and owner handoff

- Hạo: pending independent Admin/Monitor/navigation/storage PRs need review/integration and additional AC; Tourist production map remains missing.
- Duy: exact MapLibre/PMTiles pins/shared lock, approved Usage U1/U2 + routing/package R1/R2/R3, exact frontend origin/CORS/release target and budget.
- Tú/data reviewers: real15POI/240approved pairs, graph/PMTiles/full English shell/media package, Usage runtime and hosted readiness.
- User/device operator: Docker Desktop Linux engine and disposable local integration; real iPhone/Safari/Android/GPS/network test hardware.
- Release remains NOT READY. Evidence gate validates completeness only, cannot manufacture a Duy approval or validate a real experiment merely from a PASS string. No automatic deployment action exists in these scripts.
