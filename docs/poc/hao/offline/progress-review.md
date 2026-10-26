# Offline progress and local verification — Issue 79

This incremental slice updates the internal package store and OfflinePanel. It does not approve/replace the shared manifest, register a service worker or mount a complete production offline guide.

- The store exposes a subscribable snapshot. Progress counts only bytes whose byteLength/SHA256 passed verification, not network bytes or a readiness promise. A complete file count still waits for the shell marker and atomic active-pointer commit.
- Optional browser storage estimate/persistence failures no longer abort an otherwise verified download. Real quota failures still fail; persistence refusal never grants permanent-storage guarantees.
- Reopening validates the stored descriptor before shell/file checks; missing, malformed, empty-file metadata or storage errors cannot become Ready. Reopen cannot run over an active download. Each admitted descriptor is copied to prevent caller mutation during asynchronous file processing.
- Notification failures cannot turn an already committed package into a failed transaction. Failed candidate updates retain the old active pointer; no old cache deletion is introduced.
- OfflinePanel rechecks native state on mount, subscribes to verified progress, disables repeated preparation for the same verified active version and indicates a different proposed version as an available update. It reuses existing translated resources; no language/schema dependency changes.

## Evidence

39 web unit tests passed. Two isolated Chrome tests use native IndexedDB/Cache Storage: activation/readback after reload, failed-candidate preservation, visible progress, corrupt-metadata rejection and mobile viewport fit. The panel fixture is labelled synthetic and contains no real map, graph or narration. No service worker is installed by these tests; reloading the local fixture is not proof that the web app launches without network. Workspace build and production fixture scan pass; these unmounted primitives are additionally compiled/exercised through Vite browser fixtures.

Reproduce with the normal Vite server and `/test/offline-panel-fixture.html`. The fixture pauses file delivery until `window.offlinePanelFixture.release()` in its isolated test context; this is test-only. Browser tests automate this and check the real persisted state. The ignored screenshot `.bootstrap-review/issue79-offline-invalid-mobile.png` shows corrupt metadata failing safely.

Still pending: approved real artifact/manifest bridge, full shell service worker, map/graph/15 POIs and English audio, production navigation integration and actual iOS/Android offline reopening. Same-version repair of an already-active damaged package is not implemented; PACKAGE_ALREADY_ACTIVE remains explicit. Cross-tab download coordination is also not claimed. Keep Issue79 open. Duy reviews and decides merge into codex/poc-demo.
