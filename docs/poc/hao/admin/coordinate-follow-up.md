# Admin coordinate regression follow-up

Refs #77. Follow-up against integration2e88940, preserving Duy's Monitor/workspace/exact-asset review integration. PR88 was merged at eb55c0b before the later local coordinate fix5bd6f02; this branch reapplies only that fix on the current integration, without replaying old workspace sources.

New drafts require explicit marker coordinates; blank inputs stay null, never become0. Partial/out-of-range marker/entrance blocks Create/Save; entrance may remain null for a draft. A genuinely entered0 remains valid under the existing coordinate contract. First field edit now preserves the initial null/default fields. Backend gates and geography validation are unchanged.

All existing browser fixture create flows now enter labelled synthetic coordinates explicitly. Regression unit/browser counts and exact final SHA are supplied in the PR handoff after execution. No live mutation/secret/dependency/lock change. Current PoC is online-only per ONLINE-SCOPE.md; no offline work is activated by this change.

Executed locally: npm ci (pinned Node24.18.1/npm11.16.0),47unit tests,5locale tests,12fixture browser tests, full workspace build, scaffold check and production artifact scan passed. Browser tests assert Create remains disabled after text entry without coordinates. Offline prototype tests are regression-only and do not activate offline product scope. Build reports a MapLibre chunk-size warning. Docker/Mongo/live/device/hosted acceptance not executed by this follow-up.
