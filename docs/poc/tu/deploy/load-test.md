# TU05 visitor load runner

Refs #75. `scripts/poc/load/usage-load.mjs` measures the public visitor path against a Usage
origin and a Content origin. It is a measurement tool, not acceptance, and it is not run by CI.

## What one virtual visitor does

1. `GET Content /api/v1/pois/:poi?language=:code` (published detail, no JWT).
2. `POST Usage /presence/heartbeat` with a fresh UUIDv4 `browserId`.
3. A `--listen-ratio` share of visitors `POST /listening/start` for the same POI/locale.
4. Every 30 s (jittered): presence heartbeat, plus listening heartbeat when listening.
5. At the end: `POST /listening/:id/end` with reason `closed`.

Visitors start evenly over `--ramp` seconds. With a Staff/Manager Bearer in
`VINLOOK_LOAD_STAFF_TOKEN`, the runner also reads `/monitoring/summary` every 30 s
(within Usage's 12/min monitor limit) so observed counts can be compared with
`expectedMonitor`. The token is never printed or written.

## Guards

- `--confirm-target` must repeat the exact `--usage` origin; HTTPS only, except
  `127.0.0.1`/`localhost` for disposable local stacks.
- Hard caps: 50 visitors, 600 s duration, 300 s ramp, 15 s request timeout; no retries,
  no redirects. At 50 visitors the steady rate is ≈200 Usage requests/min, under the
  service's 600/min global and 60/min per-browser limits.
- `--poi` must be a published POI; the runner never creates content, accounts or sessions.

## Run

```bash
node scripts/poc/load/usage-load.mjs --usage https://<usage-origin> --content https://<content-origin> --confirm-target https://<usage-origin> --poi <poiId> --language en --visitors 10 --duration 120 --ramp 30 > load-report.json
```

Do not commit reports that name private origins. Record cold vs warm state yourself:
Render Free sleeps, so `firstSuccessMs` on the first run after idle is the cold-start
observation and later runs are warm.

## Report

JSON on stdout: per-endpoint request count and p50/p95/max latency, status counts
(including `timeout`/`network`), `firstSuccessMs`, expected vs observed monitor counts.
Latency is measured from this machine, so network distance is part of every number.

## Not done here

No live run. A run against the deployed services needs Duy's approval of target,
visitor count, duration and timing (#75). Increase towards 50 in steps
(for example 10 → 25 → 50) and stop on errors or 429s.
