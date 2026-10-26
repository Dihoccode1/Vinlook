# R2 verified tile reader

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

This reader does not calculate routes, snap GPS, mount the UI, attest coverage or
make candidate artifacts production-ready. The remaining route layer must check
cross-tile target node identities when expanding them, preserve directed topology,
bound search state, support Worker cancellation and retain the existing entrance
and connector rules. Hosting and mobile memory acceptance remain open.

Verification: `node --test packages/poc-routing/test/tile-store.test.mjs`.
Fixtures cover lazy requests, concurrent reuse, unchanged boundary edges, byte
tampering, incorrect manifest pins, invalid resident sources, streamed byte limits,
request exhaustion, close and cache eviction. No cloud or database calls.
