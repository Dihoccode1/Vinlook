# Online navigation UI/controller follow-up — Issue79

Follows Duy's online-only PoC scope (ONLINE-SCOPE.md). No offline package/service-worker work is added.

## Delivered

- Subscribable stable controller snapshots for a React navigation panel, with explicit start/cancel, location-denied/unavailable, calculation/no-route and arrival states using the existing16-language UI resources.
- GPS watch callbacks are generation-bound: queued fixes/errors from a stopped or replaced target cannot route/arrive for the next destination.
- A Worker result with the wrong request/graph/POI/revision tuple is rejected and releases the current calculation as GRAPH_INCOMPATIBLE instead of hanging indefinitely.
- GPS API exceptions become safe unavailable state. Cancel/arrival/hidden-page/unmount clean up the foreground watch/Worker. Arrival never starts narration.
- The panel stops its old controller target when the destination tuple changes. No ETA/straight-line fallback/new engine schema/provider is introduced.

## Validation

43web unit tests pass. The isolated Chrome mobile fixture tests explicit start, denied GPS, cancel/watch cleanup, fresh route/arrival and no audio/autoplay. Its synthetic Worker geometry is labelled and never imported by production. Workspace build and production artifact scan pass. The ignored mobile screenshot was visually inspected.

Run the normal local Vite server and open `/test/navigation-fixture.html` for the labelled component. The browser test drives only `window.navigationFixture` synthetic fixes; no actual geolocation/network/provider is used.

## Still needed before live acceptance

NavigationPanel is an independent component, not yet wired into the public tourist screen. The actual map/graph/Worker binary bridge and approved measured budgets from #74 are required before production activation, map route rendering and real step instructions. This PR does not claim successful road routing, HCMC coverage,5second latency or phone acceptance. Keep #79 open. Duy reviews/decides merge into codex/poc-demo.
