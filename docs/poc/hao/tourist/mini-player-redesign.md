# Mini-player annotation follow-up

Refs #76. Implements the user's annotated design: the active POI thumbnail replaces the audio bars; backward10s, Play/Pause and forward10s controls sit together before the progress/time display. The close control remains at the end. Desktop uses one row; narrow screens retain the image/title and close above controls/progress instead of hiding progress. Controls have44px targets and keyboard focus styles; media time remains LTR within RTL UI.

Seeking uses the existing media element only when playing/paused and actual duration is finite. It clamps to0/duration, retains paused/playing state and does not call play, start a new listening session or introduce telemetry fields. Native seek rejection is handled without throwing. No autoplay, production fixture, dependency, contract, content or live environment change. Images use the existing Picture component/fallback and published thumbnail URL.

Verification on pinned Node24.18.1/npm11.16.0:49 PoC unit tests PASS;12 existing fixture browser tests plus3 actual Tourist entry groups PASS. The latter verify actual thumbnail src, forward/back10s, immediate progress updates, no extra play, control ordering and no horizontal overflow at320/390/1280px. Added unit checks cover start/end clamping, paused seek, absent/infinite duration and native seek rejection. Frontend build, artifact scan, focused ESLint/Prettier checks PASS; existing MapLibre size warning remains. Native narration quality and physical-device acceptance not claimed.

The browser test image, map style, public DTOs and media are intercepted synthetic fixtures, never product assets. Local screenshots: `.bootstrap-review/mini-player-redesign-{320,390,1280}.png` and component screenshots `mini-player-card-{320,390,1280}.png`. Run with the process-local loopback Content/style setup from the Tourist integration runbook and `node --test tests/poc-web/tourist-production.browser.mjs`.

Based on integration `ba212c3`, independently of GPS recovery PR #128. Duy reviews and decides merge/deploy. Unrelated local `services/content/test/jobs.integration.test.js` is preserved and excluded.
