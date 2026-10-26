# POC-HAO-03 — independent Monitoring component

Refs #78. Semantic component/state only: no unapproved Usage HTTP bridge enabled. Duy review required for U1/U2 in merged `docs/poc/tu/usage-contract.md`, which still explicitly says PROPOSED. Merging documentation is not inferred as approval of every wire detail.

Active Staff/Manager current authority required, no work session required. Poll30s only while visible; stop timers/invalidate late results on hide/unmount. Successful summaries carry server asOf/refreshedAt; failure retains last known counts/time as stale, never creates zero.401/403 clears all protected samples. Health/jobs failure shown unavailable/unknown, not healthy or zero. PerPOI sum may exceed global; Pause remains a listener. No location/session identity list shown. Host injects semantic authenticated closures with memory-only JWT; route/login wiring deferred to Admin integration after its review.

Tests: `node --test tests/poc-web/monitor/state.test.mjs`. Labelled dev screen `/test/monitor-fixture.html`; not production data. Reuse portable Node24.18.1. No new dependency/backend/shared env changes. Live Usage multi-browser/90s counts, HTTP bridge, real backend authority, phone/Safari and production route are pending; not full #78 acceptance. No issue close/merge performed.
