# R2 verified tile routing

Follow-up to PR121 / Issue74. Duy implements and reviews before merge.

`packages/poc-routing/src/tile-store.mjs` reads the candidate format produced by
the real HCMC build. It requires an explicit HTTPS manifest URL, independently
pinned manifest SHA256, graph version and numeric resource budgets. No hosting
provider, URL or production configuration is selected by this change.

The manifest is fetched once. Tile requests are serialized, retained in an LRU
cache and verified against the pinned manifest's exact byte length and SHA256.
Repeated queued requests reuse the verified cache. Redirects and credentials are
disabled. Streaming byte caps, timeouts, request budgets, tile counts and row
limits stop oversized inputs. Graph/profile/tile identity, node ownership,
resident edge sources and target coordinates are validated; cross-tile directed
edges remain intact. Encoded cache bytes are bounded, but this is **not a measured
JavaScript heap bound**: parsed objects and caller-held tiles also use memory.

`tiled-route.mjs` snaps against directed edges within50m, admits an end connector
only within the configured entrance tolerance and searches the full directed graph
using lazy Dijkstra. It does not restrict the search to a rectangle or the15POIs.
Outgoing adjacency is loaded from the current node's owner tile. Cross-tile target
identity/coordinates are verified on expansion. Partial start/end edge costs and
same-edge routes are supported. State, settled nodes, relaxations, heap entries and
result points have explicit caps; exhausted budgets fail rather than truncate a
route or return a false `NO_ROUTE`. Weak-component labels are not used as proof
of directed reachability. Instructions reuse the current guidance formatter.

The existing route client/Worker accepts one of graph/CSR/tiles. Tile limits and
search limits are explicit; the normal route result contract, destination/version
binding, timeout and physical Worker termination are retained. GPS stays inside
the Worker; tile requests carry tile IDs only. No GPS query or credential is sent.

The UI is not mounted by this change. Coverage acceptance, hosting, mobile memory
measurements and alignment of all15 approved arrival points remain open.

Verification: `node --test packages/poc-routing/test/tile-store.test.mjs packages/poc-routing/test/tiled-route.test.mjs packages/poc-routing/test/route-worker.test.mjs`.
Fixtures cover lazy requests, concurrent reuse, unchanged boundary edges, byte
tampering, incorrect manifest pins, invalid resident sources, streamed byte limits,
request exhaustion, close and cache eviction. Route cases compare against the
existing monolithic guidance, test disconnected/one-way paths, connector rules,
budget/cancellation, target identity and a real Node Worker running the browser
entry with fixture HTTPS responses.14 focused tests pass. No cloud/database calls.

Local-file smoke measurement on the actual HCMC candidate:3,209.42m route,
143geometry points,12,817settled nodes,18file responses (manifest+17tiles),
8,262,355cached encoded bytes,256ms on this Windows/Node machine. Process heap
at the end was62,294,360bytes (not peak). These are selected OSM network nodes,
not a phone GPS test or approved POI entrance acceptance. See the public measurement
JSON; no network request was made for this run.
