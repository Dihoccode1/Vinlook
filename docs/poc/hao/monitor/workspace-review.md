# Monitoring workspace follow-up — Issue 78

This slice improves the injected Monitoring component; it does not enable an unapproved Usage HTTP bridge or mount a production route. No new backend schema, dependency, endpoint, environment value or deployment is introduced.

## Changes

- Responsive operations dashboard with summary cards, three explicit sample timestamps, per-POI table, dependency health and complete job-state counts.
- Failed reads preserve last-known visitor/listener counts as stale. Zero is displayed only from a valid successful server sample.
- Both asOf and refreshedAt must be within the existing 30-second freshness window and not in the future; otherwise the sample is stale.
- Returning to a visible tab can refresh immediately despite an older hung request. Late responses cannot overwrite the newer generation, and old finally handlers cannot release its busy guard.
- A 401/403 from one endpoint clears protected data without waiting for a hung sibling endpoint.
- Health/jobs are normalized into display-only fields. Invalid or partial values cannot crash rendering or invent healthy/zero job states. No raw response details are copied into the dashboard.

## Verification and review

36 web unit tests passed. The isolated Chrome Monitoring test verifies stale retention, successful zero recovery, malformed dependency data, viewport fit at 390px and clearing protected counts on 401. Mobile and stale desktop screenshots were generated and visually inspected under ignored `.bootstrap-review` outputs. Workspace build and production artifact scan passed; the existing large map-chunk warning is unchanged. The Monitoring module is currently excluded from the production entry route pending the approved bridge, so component acceptance comes from the direct fixture browser test, not that build alone.

Run the normal Vite dev server and open `/test/monitor-fixture.html`; the yellow banner explicitly identifies synthetic counts. The fixture exposes `window.monitorFixture.fail`, `zero`, `malformed` and `unauthorized` switches for local review only. Refresh now after changing one; do not interpret these as live controls.

Duy reviews and decides merge into `codex/poc-demo`. Keep Issue 78 open for the approved Usage HTTP bridge, memory-only authenticated production route, real multi-browser telemetry/counting and device acceptance. No work session is required merely to view Monitoring; active Staff/Manager authority is checked on every refresh.
