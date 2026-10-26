# Backend integration checkpoint —26October2026

Scope: online-poc-v1. Source checkpoint1e16acc; live services have independently
pinned deployments. Source availability is not proof of hosted acceptance.

| Capability | Existing backend | Frontend/integration status | Next action |
| --- | --- | --- | --- |
| Authentication, current account, RBAC | Identity auth + /me + internal authorization | Live Manager login and Usage authority verified | Retain current JWT closure and role checks |
| Daily work sessions | Identity open/close | AdminA wired; existing open session observed | Verify close only during an explicitly intended session change |
| Draft and localized text | Content draft/read/PATCH/clone | AdminA wired | Load known POI001 for read-only version/content inventory |
| Thumbnail upload | Content media intents/file/status/reconcile | AdminA wired | Requires actual approved image and explicit upload operation |
| Translation/audio jobs | Content process/list/read/retry/run-next; local worker | AdminA wired for revision jobs; live canaries historically verified | Fresh inventory before exact quota-bounded batch; do not resend unknown results |
| Language review and publication | Content review/submit/return/publish | AdminA wired | Need16current reviewed locale pairs plus valid thumbnail/arrival before publishing each POI |
| Tourist list/search/nearby/detail/audio | Content public endpoints | Live HTTP and UI connected; public list was empty at deployment | Publish complete content through existing gate; no fake production data |
| Presence/listening summary | Usage public events + authenticated summary | Live catalog/readiness/CORS; real online count0→1 verified | Real playback acceptance waits for published audio |
| Dependency readiness | Identity/Content health routes | Both /health/ready return503 unconditionally in current source | Implement separately reviewed real dependency readiness, never substitute liveness |
| Global jobs/worker monitoring | Usage intentionally reports unknown | No Content-owned aggregate/worker-status bridge exists | Agree minimal authenticated Content aggregate before implementation; no cross-service DB reads |
| Staff approvals/recovery/audit/deletion | Identity staff/recovery/audit and Content lifecycle APIs exist | Outside selected AdminA screens | Keep secondary to content/map/navigation critical path |
| Walking routing | Merged core/importer/CSR candidate/node Worker PR104/105 | GPS guidance bridge PR107 pending review; UI controller exists | Review107, provide real graph/style/provenance/connectors and measured limits before mounting |

## Focused correction

Live Monitoring showed server timestamps about5.3seconds ahead of the browser,
causing false SAMPLE_STALE. UI now tolerates at most10seconds of forward clock
skew while keeping the30second stale-age limit and rejecting asOf after refreshedAt.
This is bounded tolerance, not clock synchronization or backend readiness. Large
skew, old data, missing samples and authorization failures retain existing handling.

No hosted deployment, provider call, POI mutation or readiness override is included
in this change. Duy reviews/merges; deployment uses a subsequent exact commit plan.
