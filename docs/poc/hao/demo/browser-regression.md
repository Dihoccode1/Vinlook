# Complete frontend browser regression

Refs #80 and #76. The existing browser runner found only `browser.test.mjs`, silently omitting `tourist-production.browser.mjs`. Discovery now accepts both existing conventions and keeps both out of the unit run. No browser dependency, CI provisioning, product code, shared contract, lockfile or environment file is changed.

## Reproduce on Windows

Use the project-pinned Node24.18.1/npm11.16.0 and an existing reviewed Playwright installation. In a project terminal:

```powershell
$env:PATH=(Join-Path (Get-Location) '.tools/node-v24.18.1-win-x64')+';'+$env:PATH
$env:VITE_CONTENT_ORIGIN='http://127.0.0.1:5176'
$env:VITE_MAP_STYLE_URL='http://127.0.0.1:5176/style.json'
npm.cmd run dev --workspace=@vinlook/web -- --port 5176
```

These process-local loopback values are test settings, never deployable map/content artifacts. Start a second terminal with the same pinned Node PATH:

```powershell
$env:VINLOOK_PLAYWRIGHT_MODULE_PATH='<absolute-reviewed-playwright-path>/index.mjs'
$env:VINLOOK_UI_TEST_ORIGIN='http://127.0.0.1:5176'
node tests/poc-web/e2e/run-tests.mjs unit
node tests/poc-web/e2e/run-tests.mjs browser
```

The complete browser run requires the configured actual App entry as well as separate labelled development fixture pages. Public HTTP/style/media responses in the Tourist suite are intercepted synthetic data; no provider, Atlas, generation, upload or live mutation is performed. Existing offline prototype tests remain regression-only and do not activate offline product scope.

## Executed evidence

Base integration: `2e88940e6fbc3a91e3ea8034c0688ccb2975376e`. Local Node24.18.1/npm11.16.0, Chrome headless with isolated contexts: **45 unit tests and15 browser tests PASS**, including all3 formerly omitted Tourist groups. Unit count excludes the2 coordinate tests on separate unmerged PR #117; the branches are independent. Discovery assertions cover both naming conventions, no browser suites in unit mode and no duplicates.

Tourist coverage: actual App/MapLibre worker and15 synthetic marker buttons; search/detail/player without autoplay; Play/Pause/Resume and locale stop; GPS refusal and actual nearby result count; empty/error/retry;16 locale responses; RTL and390/1280px layout. Screenshots are saved locally in ignored `.bootstrap-review/issue76-app-test-390.png` and `issue76-app-test-1280.png`. This is component/transport-double evidence, not real map, audio quality, physical device or live release acceptance. No build is required for this test-discovery-only change; CI still owns its existing build checks. Browser suites remain manually provisioned; this PR does not claim CI executed them.
