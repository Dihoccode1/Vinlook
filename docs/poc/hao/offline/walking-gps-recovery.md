# Walking directions: GPS recovery follow-up

Refs #79. Report: the visitor clicks Walk to a published POI and receives `Your location is unavailable.` The failure occurs before the graph query; it does not prove a graph/route failure. Desktop location services may be unavailable or provide accuracy worse than the unchanged50m navigation limit.

Base integration `ba212c3` is preserved. The fix gives navigation GPS watches a15s acquisition timeout and maximumAge0, adds explicit GPS Retry that replaces the watch and fences callbacks from the old watch, and keeps the existing graph retry separate. The panel distinguishes initial location acquisition from route calculation, displays location permission/device/accuracy guidance in all16 UI locales, and gives walking controls visible button styling. An imprecise fix never becomes a route or arrival; no fake/manual origin or threshold relaxation is introduced. Locale manifests are regenerated with native-review dispositions still pending; the additive help key retains ui-v1 compatibility.

## Executed local verification

- Locked npm ci with Node24.18.1/npm11.16.0; no pin/lock/dependency changes.
-48 PoC unit tests PASS, including bounded GPS acquisition, code2failure/retry, stale callback fencing,500m rejection and5m recovery to routing.
-13 fixture browser tests PASS, including the new GPS failure/help/retry/accuracy recovery group;3 actual Tourist entry browser groups PASS separately (current integration runner omits the latter naming convention).
-5 locale tests PASS after updating the explicit key count from51to52; sixteen resources retain exact key/placeholder validation.
- Frontend production build and production artifact scan PASS. Existing MapLibre chunk-size warning remains.
- ESLint PASS. Full format check reports existing `packages/poc-routing/src/route-worker.mjs` and `worker.mjs` formatting failures; those files are untouched. Changed runtime files pass focused Prettier verification.

Fixture GPS and Worker geometry are synthetic and labelled; no device GPS, live route query, provider, content mutation, deployment or shared environment change. The code cannot grant OS/browser permissions or manufacture accurate GPS. On the reported device, enable location services and site permission, then retry; a GPS-capable phone may be necessary when desktop accuracy is insufficient. Existing50m accuracy/25m arrival gates remain unchanged.

## Reproduce

Start Vite on loopback5180 using the pinned runtime. Set `VINLOOK_UI_TEST_ORIGIN=http://127.0.0.1:5180` and `VINLOOK_PLAYWRIGHT_MODULE_PATH` to the existing reviewed Playwright module; run `node --test tests/poc-web/navigation/browser.test.mjs`. The separate actual Tourist suite needs the process-local Content/style loopback configuration documented in the existing Tourist integration runbook. Screenshots are local ignored `.bootstrap-review/walking-gps-recovered.png`; this is synthetic evidence, not a real route photograph.

Duy reviews and decides merge/deployment; no automatic issue closure or live acceptance. An unrelated local edit in `services/content/test/jobs.integration.test.js` was observed during work and is preserved outside the commit.
