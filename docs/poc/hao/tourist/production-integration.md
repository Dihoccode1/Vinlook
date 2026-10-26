# Issue76 — Duy: production tourist integration

Branch codex/poc-duy-76-tourist-live from PoC811c8e40f05c18701080bebaa786543aa3607d4e. Separate clone under lead workspace; no original local edits overwritten. Duy explicitly approved maplibre-gl6.16.0 and pmtiles4.5.0 and confirmed map style/PMTiles artifact is not yet available (await Tú). npm metadata confirmed BSD-3-Clause for both; exact direct pins and root lock updated. No blanket npm install-script approval (bcrypt warning retained).

## Changed behavior

App now mounts real TouristApp rather than the preview. Public Content adapter powers catalog/search/debounced requests/explicit cursor pagination, POI detail, image failures, empty/error/retry and GPS nearby actual counts. GPS is memory-only and only sent to the public nearby operation; no telemetry location/history. Same-source snapshot pagination rejects changed snapshots or duplicate identities. Search/details cancel outdated requests; locale switching never displays old-language detail/audio as current. Native player retains no autoplay, pause/resume identity, explicit replay/close/replaced/ended/pagehide cleanup. Telemetry uses existing browser identity/semantic port; no Usage HTTP contract invented.

Lazy MapLibre6 view with locally bundled Vite worker (`?worker&url` per https://maplibre.org/maplibre-gl-js/docs/), PMTiles protocol, native map attribution/navigation, accessible POI marker buttons and current-location indicator. Configured source errors show retry, absent source stays explicitly unavailable; no vendor default, external map service, fake geography or draft POIs inserted. Geography stays LTR; UI supports all sixteen locales and RTL. Supplemental tourist copy is assistant-authored draft and still needs language review.

Public config names only:
- VITE_CONTENT_ORIGIN: actual Content public origin (required for catalog); never staff/draft route.
- VITE_MAP_STYLE_URL: approved HTTPS MapLibre style JSON referencing approved PMTiles sources; local HTTP loopback accepted only in development. User has no artifact yet. Style must include source attribution and verified artifact URLs/Range/CORS under Tú's package plan.

VITE_IDENTITY_ORIGIN/VITE_USAGE_ORIGIN remain existing separate adapters; no keys/JWT in visitor config. Missing content configuration is visible and retryable, not a fixture fallback. No shared hosted environment, CORS or live data mutated. No deployment/provider/generation/upload/publication performed.

## Validation actually run

Node24.18.1/npm11.16.0; npm ci then approved exact map dependency install.
- npm run build: web + all three services pass. Map library is lazy split; map chunk ~300KiB gzip and worker~519KiB uncompressed; remaining large-chunk warning is not hidden and mobile performance still needs actual-device measurement.
- node tests/poc-web/e2e/run-tests.mjs unit:29 passed (existing plus3 catalog/config/copy tests).
- npm run test:ui-locale: existing5 tests passed.
- node tests/poc-web/e2e/check-build.mjs: production artifacts scan passes, no fixture code/URLs.
- Browser command below:3 groups passed against actual App route with15 synthetic public DTOs, intercepted style/background, media double, not cloud or real cartography. Checks map ready/worker loaded/15markerbuttons; public-only requests/search/details; no autoplay and play/pause/resume/locale-close; deniedGPS and actual2 nearby; empty/error/retry; all16 completed locale responses; RTL/no overflow390/1280px. Screenshots in ignored .bootstrap-review are test evidence only, not tourism content/real maps.
- git -c core.whitespace=cr-at-eol diff --check passes; existing CRLF package/lock are preserved. Default git whitespace check flags CR on newly expanded npm lock entries, not code spacing; no unrelated lock rewrite.

```powershell
$env:VITE_CONTENT_ORIGIN='http://127.0.0.1:5176'
$env:VITE_MAP_STYLE_URL='http://127.0.0.1:5176/style.json'
npm run dev --workspace=@vinlook/web -- --port 5176
# second terminal; use an existing reviewed Playwright installation
$env:VINLOOK_PLAYWRIGHT_MODULE_PATH='<absolute-path-to-playwright/index.mjs>'
$env:VINLOOK_UI_TEST_ORIGIN='http://127.0.0.1:5176'
node --test tests/poc-web/tourist-production.browser.mjs
```

Browser tests intercept style/HTTP/media only inside isolated test contexts; normal App does not contain these fixtures. The quoted local style URL is not a real style artifact and must not be deployed. Initial browser run was blocked by sandbox loopback; unchanged run outside sandbox reached app. Found/fixed MapLibre6 namespace/worker integration before final passes. An initial retry test raced query reload; reordered it and now awaits exact response locale/map-ready before screenshots. No physical phone or live audio quality acceptance implied.

## Completion boundaries

This PR completes the independently implementable UI wiring for #76. Keep Issue open: real PMTiles/style/coverage from Tú, published15POI/240pairs, native language review, approved Usage HTTP bridge, exact CORS/hosted config, real-device/live audio/GPS performance and deploy acceptance remain. Routing/offline package and navigation controls belong to #79; do not add fake directions/download buttons here. Duy reviews/merges into codex/poc-demo; do not merge main or close original backlog.
