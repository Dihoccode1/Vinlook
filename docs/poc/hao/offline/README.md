# POC-HAO-04 — navigation/storage building blocks

Refs #79. Baseline D009/011/012 retained. Independent implementation, not complete offline guide acceptance. No real artifact/provider/download or deployment.

`navigation/controller.js` wraps merged Tú navigation policy, keeps foreground GPS watch only, clears watch on hide/stop/arrival, terminates injected Worker on cancellation, ignores late results and rejects mismatched request/graph/POI/revision tuple. Retains route on GPS loss; no ETA/voice/background routing/autoplay or straight-line fallback. Worker wire/binary bridge is not invented: host supplies an approved workerFactory and explicit policy budgets. R1/R2 still need review before production wiring.

`offline/package-store.js` owns semantic download lifecycle with injected approved manifestAdapter, file fetch, native persistence and shell cache adapter. Missing adapter fails MANIFEST_REVIEW_PENDING. This internal interface is not a replacement R3 shared wire schema. Each byteLength/SHA256 is checked before verified storage; quota estimate includes20% candidate allowance; persistent storage best effort. Cache shell marker must exist before atomic IndexedDB active pointer change. Failed network/checksum/quota/marker keeps old active. Reopen checks marker and hashes; eviction becomes incomplete. Complete withdrawal snapshots hide presentation only; no old-cache/media deletion implemented.

Native IndexedDB uses approved local stores packages/packageFiles/settings. No auth/admin response/JWT cached. Service worker and PMTiles offline Source are not installed: complete shell inventory, real map/graph/media artifacts and shared manifest approval are missing. OfflinePanel is a reusable primitive; complete progress/navigation/map UI remains pending.

Tests: `node --test tests/poc-web/offline/navigation.test.mjs tests/poc-web/offline/package.test.mjs`; browser `tests/poc-web/offline/browser.test.mjs` via existing Playwright/Chrome, loopback Vite. Native browser fixture `/test/offline-fixture.html` explicitly labelled, no production entry. Final results are in PR handoff, never infer full guide ready from synthetic bytes passing.

Pending: approved R1/R2/R3 wire bridge/artifact compatibility, Worker implementation/snap/instructions integration, service worker shell, PMTiles/English15POI/audio package, UI progress/checksum/quota and real update/reopen tests, complete tombstone wiring to map/player/navigation, real Safari/iPhone/Android/GPS acceptance. Duy chooses contracts and release; no issue close or merge by agent.
