# TU02 jobs/worker status bridge — proposal for Duy

Refs #71. **Proposed, not implemented.** Live Monitoring (26 Oct) shows jobs `unavailable` and
worker `unknown` with `BRIDGE_PENDING`, because Usage has no safe source for either. Usage must
not read Content's database, and the existing `GET /admin/jobs` needs a `revisionId`, so it cannot
give global counts. The data is owned by Content, so the endpoint below is a Content change that
Duy approves (and owns or delegates); Usage only consumes it.

## Facts from the current Content code

- `ProcessingJob.status` ∈ `queued|running|succeeded|failed|waiting_quota`, with index
  `{status:1, createdAt:1, _id:1}` and `{status:1, leaseExpiresAt:1}`.
- A running job holds `leaseOwner`, `attemptId`, `leaseExpiresAt`; claim sets a 5 min lease and
  the worker renews every 60 s while it is processing.
- The worker has **no idle heartbeat**: it talks to Content only while it holds a job (by design;
  no background ping, so Render Free can sleep).

## Proposed Content endpoint (C1)

`GET /api/v1/internal/monitoring/jobs-summary`, no body, no query.

- Auth: a dedicated `usage` caller key for Content (separate from worker keys, the public cursor key
  and Identity keys), same verification style as Identity's internal authorize caller. Not reachable
  with staff JWTs or worker keys.
- Response `data`:

```json
{"asOf":"2026-10-26T00:00:00.000Z",
 "counts":{"queued":0,"running":1,"succeeded":12,"failed":1,"waiting_quota":0},
 "worker":{"activeLeases":1,"lastLeaseRenewedAt":"2026-10-25T23:59:30.000Z"}}
```

- `counts`: five `countDocuments({status})` calls on the existing status index, taken in one read
  snapshot; totals since creation (no new index or retention change).
- `worker.lastLeaseRenewedAt`: `max(leaseExpiresAt) − 5 min` over `status:running` leases, or `null`
  when there are none. This is the latest time a worker proved it was alive; it is not a ping.
- Bounded: 3 s server deadline, no caching in Content, safe `503 DEPENDENCY_UNAVAILABLE` on DB error.

## Usage mapping (U-side, Tú implements after C1 is approved)

| Content answer | `/monitoring/jobs` | worker health component |
| --- | --- | --- |
| 200, fresh | `status: ok`, counts copied | `activeLeases>0` and renewed < 180 s ago → `up` (observedAt = renew time) |
| 200, no running lease | `status: ok` | `unknown`, `errorCode: WORKER_IDLE` (idle is not down) |
| 200, lease renewed ≥ 180 s ago | `status: ok` | `stale`, `SAMPLE_STALE` (existing 180 s rule) |
| timeout / 5xx / bad shape | `status: unavailable`, counts `null` | `unavailable`, `DEPENDENCY_UNAVAILABLE` |
| sample older than 30 s | `status: stale`, last counts kept with old `checkedAt` | `stale` |

This fits the existing `createHealthSampler` worker probe contract (`{healthy, observedAt}`) and the
U1 jobs shape; only `WORKER_IDLE` is a new safe code. Counts are never fabricated as zeros.

## Alternatives considered

- **Worker idle heartbeat** (`POST /internal/worker/heartbeat` every 60 s): gives `up` while idle,
  but it is a background ping that keeps Render Free awake and adds a write path. Not recommended.
- **Usage reads Content DB**: violates service data ownership. Rejected.

## Decision requested

Approve C1 + the mapping above (A), or return changes (B). Also: who implements the Content route
(Duy, or Tú in a separate Content PR), and the env name for the new caller key
(proposed `CONTENT_USAGE_CALLER_KEY_B64URL` in Content, `USAGE_CONTENT_CALLER_KEY_B64URL` in Usage).
No code, schema, key or deployment change is made by this document.
