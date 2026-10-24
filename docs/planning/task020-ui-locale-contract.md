# TASK-020 — Tourist UI resources and RTL contract A

24 October 2026 UTC+7. PROPOSED; explicit approval before code. Actual Issue [41](https://github.com/Dihoccode1/Vinlook/issues/41). Owner Hạo (2107h06), reviewer Duy (Dihoccode1), unchanged. TASK002 scaffold prerequisite merged; existing8h estimate is not a completion promise. Traceability TASK020/REQ009/010, FEAT001/002/003/004, US007/009/010/012/014/015, UC010, AC009/010.

## Retained approvals and scope

DEC030: online tourist UI supports all sixteen languages. DEC006/032: offline UI/descriptions/audio use English; loss of connectivity stops non-English narration, with English playback only after another Play. DEC033: Admin/Monitoring UI stays English. DEC080/D020: use i18next/react-i18next and versioned JSON, system fonts and logical RTL layout, no map/coordinate mirroring. Do not replace these decisions or restart language/provider selection.

This task implements the resource baseline and reusable locale boundary, and translates the current tourist preview plus its language selector/status messages. It supplies common map/navigation/audio/offline labels/templates for the later screens. Actual maps, POI retrieval, playback, routing, downloads/service worker/cache lifecycle and staff screens stay with their planned tasks. No demo controls implying they already work. No claim that embedding English strings creates a working offline package.

## A recommended / B alternative

A: manual tourist selection, memory scoped to the current tab, default English; offline forces English and reconnect keeps English until the tourist selects again. Predictable, no new persistent storage or browser detector. A refresh starts English; independent tabs do not change one another.

B: persist preference across visits and restore it automatically after reconnect. More convenient, but requires a reviewed storage key/migration/privacy lifecycle, synchronization and timing rules. This is not selected by existing language approvals. Selecting B needs a replacement persistence/reconnect contract before code.

## Libraries and bundle

Proposed exact pins i18next26.5.10 and react-i18next17.1.8, compatible React19 peer ranges verified through public npm metadata. TypeScript peer is optional; retain JavaScript/JSX. Record exact resolved transitives in package-lock before review. No browser-language detector, HTTP resource backend, SaaS or runtime Gemini translation. Keep existing React/Router/Tailwind versions.

Bundle all sixteen small resource JSON files through Vite with the app, English available synchronously. `supportedLngs` is the exact allowlist; `load:currentOnly`, no automatic base-language/variant substitution, English fallback for an unexpectedly absent UI key only. Never use that fallback to declare POI/audio content complete. Disable debug/saveMissing/network backend; do not fetch translations on user visits. Missing English key is a build/check failure. Missing selected-locale key/placeholder mismatch fails completeness verification even if runtime fallback can preserve readability.

Resource version `ui-v1` with checked-in manifest: schemaVersion1, resourceVersion, exact locale/file list, deterministic content hashes, per-locale review disposition. Hash content canonically so checkout line endings do not change compatibility. Future offline package tooling consumes this version/hash manifest; no IndexedDB/cache/package-format change here. Future changes to resource shape/version require updating the manifest and same completeness checks.

## Exact locale and resource boundary

UI/POI/audio selection codes remain `en,zh-Hant,hi,es,ar,fr,bn,pt-PT,id,ur,ru,de,ja,pcm,ar-EG,vi`. Traditional Chinese, Portugal Portuguese and separate Standard/Egyptian Arabic retained. Never map a selected dialect to another resource silently. Labels use explicit reviewed language names/endonyms; expose lang on option/label text and isolate mixed scripts. No flag icons as language identifiers. English Admin/Monitoring will use a separate English/LTR boundary and ignore tourist selection.

One English resource defines exact namespace/key shape; every locale has the same string keys and interpolation parameter sets. Proposed key families:

- `preview`: title, subtitle, statusTitle, statusBody (the current scaffold copy).
- `language`: label, choose, englishOnlyOffline, reconnectEnglish, changed.
- `common`: loading, retry, cancel, close, back, unavailable, empty, error.
- `map`: title, locateMe, locationDenied, locationUnavailable, nearby, noNearby, foundCount.
- `poi`: details, description, noDescription, imageUnavailable.
- `navigation`: walkTo, directions, calculating, noRoute, distance, continue, turnLeft, turnRight, arrive.
- `audio`: play, pause, replay, unavailable, loading, stoppedForOffline.
- `offline`: mode, prepare, downloading, ready, unavailable, updateAvailable, downloadFailed, englishNotice.

Only count/distance/POI-name parameters are allowed where explicitly declared by the English resource, e.g. foundCount uses `{{count}}`, distance uses `{{distance}}`, walkTo uses `{{name}}`. Initial generic count labels avoid inventing a single English plural rule for all languages. No raw backend error text or dynamic HTML. React renders plain strings; no dangerouslySetInnerHTML or translated HTML tags/links. Interpolation values are escaped by React, never inserted as markup. Text cannot control direction, URL, resource lookup or object path. Translation schema rejects empty strings, unexpected markup/control/bidi override characters and undocumented parameters.

Assistant-authored non-English translations are drafts, not native review. Manifest marks unreviewed languages pending; human review is a separate quality gate, never inferred from automated key/hash checks or PR merge. Non-English strings must be actual intended translations, not English filler copied to claim coverage. English source copy remains the reference. Correct script/variant must receive specific QA; native pronunciation/audio remains outside this task.

## Locale state API and transitions

Proposed tourist provider exposes `{locale,direction,resourceVersion,mode,setLocale,setConnectivity}`. `locale` is effective presentation language; mode is online/offline. setLocale accepts exact allowlisted codes only; invalid input is rejected without changing state. Default en/LTR. Native select on the preview, labelled and keyboard accessible, updates current-tab memory only. Do not add a URL parameter, cookie, localStorage field or automatic browser-language inference.

`setConnectivity(offline)` immediately makes effective locale en, direction ltr, and emits one typed locale-change event `{previousLocale,locale:'en',reason:'offline'}` if needed. Keep English offline notice visible; other choices disabled with an explanation, not silently accepted. Future POI/audio consumers subscribe to the same effective locale and stop non-English playback on this event; test a subscriber stub here, no pretend real player. Never auto-play English or restart audio after reconnect.

When online resumes, stay en; enable the selector and announce that another language can be selected. Explicit selection is needed to change again; no automatic restoration of a previous non-English preference. Preserve that reconnect notice until explicit selection or dismissal using current-tab state only. Initial browser offline event and navigator.onLine=false can conservatively force offline. navigator.onLine=true is only a hint; actual future connectivity/offline package coordinator may call setConnectivity(offline) after failed verified operations. No ping endpoint or health/readiness polling added. This resource layer cannot prove server reachability or offline package availability from browser network events.

## RTL and accessibility

RTL only ar/ar-EG/ur. Apply html lang/dir for the active tourist boundary; staff English/LTR boundary overrides when those routes arrive. Use logical start/end spacing/alignment and natural DOM/tab order; do not reverse arrays merely to simulate RTL. Mixed POI names/numbers use bdi or explicit LTR isolation as appropriate. Coordinate tuples, map canvas/tiles/geometries, route bearing, compass and geographic left/right symbols stay physically correct; no global scaleX(-1) or mirrored coordinate values. Provide a reusable LTR geography wrapper and test with a geometry fixture; no new map library or real map screen.

System font fallback only, no mandatory CDN/font download. Test glyph display/wrapping at320/390/768px and RTL long labels, with zoom/focus/keyboard behaviour and one polite language-change/status announcement. UI should not display internal registry/hash/provider details to tourists. Technical metadata remains in version manifest/dev verification only.

## Verification after approval

Meaningful resource checks: exact16locale set/shape, placeholder parity, nonempty text/script smoke checks and canonical manifest hashes; reject injected markup and unsafe locale. State tests for independent tab instances, offline force/en, reconnect stays en, explicit reselection, staff boundary and non-English audio-stop subscriber without autoplay. Rendered browser checks for selector/label/focus/live message, Arabic/Urdu RTL and LTR geography fixture, mixed text and narrow-screen overflow; production Vite build and existing scaffold/runtime checks. Use existing available browser/test tooling where sufficient; propose any consequential new test dependency before adding it. No arbitrary unit tests of static copy mirrors.

Measure actual resource/bundle bytes after build rather than promise a new performance target. Test failures are fixed before draft PR. Browser network emulation verifies transitions only, not a cold-start/full-product offline package. No provider key/API, database mutation, deployment, real locale quality sign-off or completed map/audio/offline/50-user acceptance. Human Duy review/user merge remains separate.

Primary references checked24October2026: [i18next configuration](https://www.i18next.com/overview/configuration-options), [react-i18next instance](https://react.i18next.com/latest/i18next-instance), [HTML direction](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir), [browser online signal limits](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine). These explain mechanisms, not Vinlook acceptance results.

## Requested decision

Approve A and the detailed resource/dependency/state/RTL contract for isolated implementation/testing; or choose B/request changes. Rule1 requires approval for previously unspecified dependency pins, selection persistence/reconnect UX and resource/state API. Previously approved16locales, English staff/offline and i18next tooling do not need reapproval.

Approval: user explicitly approved A and this detailed contract for implementation/testing on24October2026 UTC+7. No native-language review, deployment or full offline-package acceptance is implied.
