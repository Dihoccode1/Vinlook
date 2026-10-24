# Tourist locale boundary (TASK-020)

Exact sixteen locale codes in locales.js; online tourist strings in resources/*.json. English source defines51keys in8groups; placeholder sets must match exactly. Traditional Chinese/Portugal Portuguese/Standard versus Egyptian Arabic remain separate. Resources and ui-v1 manifest use canonical JSON SHA256, independent of checkout line endings. All review dispositions remain pending; automated completeness/PR merge is not a native-language sign-off.

Pinned i18next26.5.10/react-i18next17.1.8. No detector, HTTP backend, runtime translation service, external font or persistent language storage. All resources bundle into the app; English is synchronous and is the safety fallback for an unexpected missing key. This fallback never marks a POI/audio translation complete. Debug/saveMissing disabled. Resource validation rejects HTML/bidi overrides, unsafe keys, unknown source interpolation parameters, empty/missing translations and placeholder mismatch. Render translations as React text, not HTML.

LocaleProvider exposes effective `{locale,direction,resourceVersion,mode,setLocale,setConnectivity}` via useLocale, plus notice and subscription helpers. useTouristTranslation binds to the effective locale so text/dir change together. Manual selection is tab-memory only: refresh/default usesEnglish. Other tabs remain independent. setLocale rejects unsupported variants; offline mode only permitsen.

setConnectivity('offline') forcesen/ltr and emits one typed locale event when a non-English locale changes. Future POI/audio components must follow this effective locale; non-English narration stops and English playback requires a new explicit Play. This task tests an audio-stop subscriber, not an actual audio player. Reconnect remainsEnglish and shows a dismissible notice until explicit language selection. No auto-restore or autoplay. Browser online/offline events provide conservative hints only; navigator.onLine=true does not prove server reachability. Future verified package/connectivity coordinator can force offline through the same API without a new polling endpoint.

StaffLanguageBoundary fixes nested translation/context/dir toEnglish/LTR and ignores tourist choice. GeographyBoundary fixes rendering toLTR without changing map geometry, coordinate data, compass or physical left/right. Use logical CSS spacing/alignment, bdi around mixed script names and explicit LTR coordinate isolation. Never mirror the entire UI/map with transforms or reverse route geometry forRTL. Future pages consume these boundaries; current App remains a translated preview and language selector only.

Checks:

```
npm run check:ui-resources
npm run test:ui-locale
npm run test:ui-locale:browser
npm run build
```

Vite/workspace build runs the manifest/completeness check first. After a reviewed resource/version change, regenerate manifest using `node scripts/check-ui-resources.mjs --write`; shape/compatibility changes require reviewing resourceVersion. Never change review status merely because regeneration succeeds.

Browser tests need a local Vite server (`npm run dev`) and an available Playwright installation. VINLOOK_PLAYWRIGHT_MODULE_PATH can point to an existing Playwright index.mjs; otherwise normal module resolution is used. VINLOOK_UI_BROWSER_CHANNEL accepts installed chrome/msedge, or omit it for installed Playwright Chromium. No browser package is downloaded by the test. Optional VINLOOK_UI_TEST_ORIGIN must be an exact loopback HTTP origin. Test-only apps/web/test/locale-fixture.html provides staff/geography/audio-subscription probes; it is not a production route or shipped build entry. No test API/debug mode is added to the tourist application.

English UI resources being bundled does not prove app-shell cold start, maps/POI/audio downloads, a complete English offline package or service worker availability. Those retain their planned tasks. Full native copy/script review, device/assistive-technology/real offline acceptance and hosted/load gates remain pending. No technical version/provider metadata is displayed to tourists.
