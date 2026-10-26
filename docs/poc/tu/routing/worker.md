# TU04 node Worker runtime

Refs #74 and online-poc-v1. This slice moves existing A* computation into a real
module Worker and implements terminate/recreate cancellation. It is independent
of the unmerged builder PR104 and needs no new dependency. Duy reviews/merges into
codex/poc-demo and approves the eventual shared GPS/artifact bridge.

## API and boundary

```js
import { createNodeWorkerClient } from './worker-client.mjs';
const client = createNodeWorkerClient({
  graph: auditedNormalizedGraph,
  config: {
    graphVersion: selectedVersion,
    limits: measuredCoreLimits,
    maxRequests: explicitRequestHistoryBudget,
    maxResultPoints: explicitOutputBudget,
  },
  timeoutMilliseconds: explicitPhaseDeadline,
});
const path = await client.calculateNodes({
  requestId: uniqueCalculationId,
  graphVersion: selectedVersion,
  fromNodeId: verifiedStartNode,
  toNodeId: verifiedDestinationNode,
});
client.cancel();  // Reject active work, remove listeners, terminate actual Worker.
// The next unique calculation creates a new Worker and reloads the pinned graph.
client.dispose(); // Terminal; subsequent calculations reject WORKER_DISPOSED.
```

`graph` is the existing core's `{nodes,edges}` normalized atomic-segment input;
see [core.md](core.md). It is copied at client creation, stripping unrelated
metadata. Flags and coordinates are checked before transfer; graph topology,
metrics, adjacency and spatial-index budgets are validated inside the Worker.
Only immutable private graph/config data are used after load. Callers must select
real budgets from artifact/device measurements; no fixture budget is a release cap.

This API accepts **node IDs**, not GPS coordinates/POIs. It must not be assigned
directly to the UI's `worker.calculate({token,position,destination,...})` interface.
No connector is inferred, no nearest-node shortcut is implemented, and no turn
instructions/arrival semantics are fabricated. The returned geometry is on-graph.
An identical source/target node returns a valid one-point zero-cost core path,
which is not the proposed R1 guidance result requiring at least two points.

## Internal transport, distinct from shared R1

Protocol identifier: `vinlook-node-worker-v1`. No production CSR/GPS wire contract
is frozen by this slice. All messages include protocol/type/requestId. Input node
and request IDs use ASCII `[A-Za-z0-9._:-]`, length1–128; graphVersion uses
`[A-Za-z0-9._-]`, length1–100. `load:` request IDs are reserved. IDs from other
normalizers must be mapped or explicitly reviewed, never silently truncated.

| Message | Additional exact fields |
| --- | --- |
| LOAD_NODE_GRAPH | config, graph |
| NODE_GRAPH_READY | graphVersion |
| ROUTE_NODES | graphVersion, fromNodeId, toNodeId |
| NODE_ROUTE_RESULT | graphVersion, fromNodeId, toNodeId, result |
| ERROR | code |

The result is the unchanged core found/no_route shape. Found results contain
distanceMeters,nodeIds,edgeIds,geometry,settled; no_route contains only settled
besides status. Client checks exact fields, finite coordinates/distance, output
budget, ID/geometry lengths, endpoints, geometric distance lower bound, search
budget and request/version binding. These are transport checks, not independent
verification that arbitrary supplied graph permissions or artifact provenance
are true. Error details/stack/source paths never cross the boundary.

The Worker loads once per lifetime and rejects reload. Client captures each
request, permits one inflight task, refuses reused IDs and bounds lifetime ID
history to maxRequests (1–10000). Each graph-load or route phase has a deadline
of1–60000ms; elapsed total can include both phases. Timeout/error/malformed response
terminates the Worker and rejects the promise. Search/output overflow fails,
never trims a successful route. Failure does not silently switch graph versions.

`cancel` invalidates the generation before termination. Old callbacks and a route
already delivered but not yet consumed cannot resolve a newer generation. A new
client is required to select a different graph snapshot. A queued CANCEL message
cannot interrupt synchronous A*, so no such ineffective cancellation is exposed.
No network, storage, GPS/history, provider or additional HTTP service is used.

The browser default is `new Worker(new URL('./worker.mjs', import.meta.url),
{type:'module'})`; bundlers must preserve/bundle these module references. The
optional Worker factory exists for platform testing. It must provide standard
postMessage/terminate and add/removeEventListener methods. Native browser Worker
termination is the production cancellation mechanism.

## Verification and remaining work

Use pinned Node24.18.1:

```text
node scripts/poc/routing/verify-worker.mjs
```

Optional installed Chrome/Playwright check, using the same external module path
convention as existing browser tests (no dependency install or lock change):

```text
VINLOOK_PLAYWRIGHT_MODULE_PATH=<installed Playwright index.mjs>
node scripts/poc/routing/verify-worker-browser.mjs
```

The browser checker serves only four allowlisted routing modules and a labelled
synthetic page on ephemeral127.0.0.1; browser requests to other origins are aborted.
It closes browser/server after checking actual Chrome module Worker path/no-route,
terminate/reload and cancellation. No live data/provider/deployment is involved.

Node tests use the exact browser entry through a test-only worker_threads adapter.
They compare144 actual-thread queries to independent Dijkstra. A dedicated
synthetic blocking fixture deliberately holds a thread in synchronous Atomics.wait;
the test observes it started, terminates it, observes thread exit and routes with
the replacement. This proves hard termination, not real-city A* speed/RAM.
Malformed/mixed responses, budgets, version/identity/reuse, timeout, errors,
snapshot mutation and cancellation races are tested. Existing core's5760 oracle
comparisons remain separate from the144 Worker comparisons.

Observed on26October2026 with pinned Node24.18.1: final expanded routing/contract/
Worker suite38/38 PASS, all available non-integration Usage/routing/Content-tool
tests123/123 PASS, none skipped. Actual headless Chrome module Worker checker PASS.
CI head results are recorded in the issue/PR after execution; pending checks are
never inferred passed. Local123 tests are module/loopback evidence; real Mongo and
production image evidence require the separate successful CI steps.

Still required: approved artifact decoder/hash/profile, real current HCMC including
merged-region/ConDao graph/map coverage and provenance, verified GPS/entrance
connectors with snapping, instructions, shared R1 adapter, Duy's UI integration,
real device/Safari/CSP/bundler/network behavior, measured memory/load/end-to-end
timing and public hosting acceptance. No production graph/artifact is downloaded
or supplied, no app is mounted, and #74 remains open. Offline bundle work is out
of current PoC scope; this slice adds none.
