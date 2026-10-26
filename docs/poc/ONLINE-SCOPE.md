# PoC online — scope decision26October2026

Authority: Duy explicitly requested “Hãy bỏ chức năng offline, tập trung hoàn thành PoC, tiếp tục tiến độ”. This decision supersedes the previous requirement that the PoC include full offline operation. It needs no second scope confirmation. Scope identifier for release evidence: `online-poc-v1`.

## Current acceptance

- Online tourist web app: real map/public15POIs, search/nearby/GPS and16distinct reviewed narration languages; no autoplay.
- Online walking navigation to the approved arrival point with foreground GPS, reroute/no-route/GPS-error handling and the required HCMC coverage. Removing offline does not remove the routing graph, correct topology, provenance or map attribution.
- AdminA real persisted content workflow, existing authorization/session/version/publication gates.
- Usage presence/listening and authenticated Monitoring with real multi-browser evidence, stale/error honesty and no background keepalive.
- Free public HTTPS deployment, exact CORS, device checks, reviewed code/CI and existing load/backup/security/release gates.

Not required for this PoC: downloadable English bundle, offline map/audio/graph storage, service-worker shell, network-off close/reopen, offline package updates/checksums/quota/eviction acceptance. Network failure is handled as an online-service failure, without promising offline availability. Privacy still forbids replaying obsolete telemetry as real-time usage.

Existing offline prototypes/tests remain dormant, unmounted and unadvertised; no service worker is registered by the product. Do not spend the PoC critical path deleting reusable code or building these features. Historical documents/examples referring to mandatory offline are superseded by this decision. Original MVP baseline documents are not rewritten by this PoC-only decision.

## Critical path and ownership

1. Tú #73: fresh content inventory/versions and source/thumbnail gaps, then exact approved live pipeline plan. Preserve the3historically reviewed pairs; no unmeasured claim that237pairs are absent. Fifteen public POIs still require240accepted locale pairs under the unchanged backend gate.
2. Tú #74: deliver the real online map style/PMTiles and walking graph/Worker-compatible artifact with provenance, measured sizes and reachable arrival semantics. Offline bundle work stops. Duy #79 integrates online navigation only.
3. Tú #71/#75: verify Usage catalog/durable runtime and prepare deployment/CORS/readiness. Duy #76/#77/#78 integrates and validates the online tourist/Admin/Monitoring flows. Code is not live acceptance.
4. Duy #80: public frontend origins/release setup, real-device rehearsal and evidence on the exact reviewed merged SHA. Do not declare readiness without real content/map/routing/telemetry.

## CI/release change

The completeness gate now requires explicit scope online-poc-v1 and12remaining real-evidence checks. Offline reopen/atomic offline update no longer block this PoC. Real evidence, exact SHA, Duy approval and all remaining checks are still mandatory; automated completeness never authorizes release. Web CI now also runs on integration pushes and Duy task branches, fixing the previous omission of web checks on merged PoC commits. No new dependency, hosting, quota, secret, database or provider call is authorized/executed by this change.
