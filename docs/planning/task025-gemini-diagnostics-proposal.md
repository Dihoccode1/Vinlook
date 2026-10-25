# TASK025 — Safe hosted Gemini diagnostics before any resend

## Approved A and concrete implementation

26October2026 user explicitly selects A, isolatedimplementation/Túreview. Endpoint returns fixed {status,category,httpStatus,jsonContentType,modelMatches?,supportsGenerateContent?} under existingdataenvelope; provider failure is diagnosticdata, not rawbody. Concurrent409ADAPTER_PREFLIGHT_BUSY, cooldown429ADAPTER_PREFLIGHT_COOLDOWN/Retry-After60; strictemptybody and Manager/opensession. Disabledconfig503. DiagnosticGET never reserves generationquota or dispatchesjob. Adds coarse oversize/response_read/aborted categories as bounded transport distinctions; logs allowlist only fixedfields, no rawexception/body. Existing externalgenerationerrorcodes and noretry remain unchanged. No live calls during implementation.

26October2026UTC+7. First vi generationjob failed PROVIDER_OUTCOME_UNKNOWN, no automaticresend. User-run local modelmetadataGET returns200JSON, exacttranslationmodelname and generateContent supporttrue; no generation. This confirms that privately supplied local key/model works, not equality with Render config or actual Render transport. No rawresponse or credential logged.

## A — Hosted read-only preflight and redacted failure categories (recommended)

Implement Manager+open-session endpoint POST /api/v1/admin/adapters/translation/preflight, strict empty JSON, no caller model/URL/key override. Use existing configured GEMINI_API_KEY to fixed HTTPSGET /v1beta/models/gemini-3.5-flash-lite; no redirects/retries, timeout10seconds, bounded64KiBJSON. Return only fixed modelmatch/support booleans or coarse category/httpstatus, never providerbody/headers/key/project details. Disabledadapter returns existingconfigurationunavailable. Limit1inflight/process and60second processcooldown for diagnostic invocation; no collection/index/dependency. This diagnostic cooldown does not replace production generation quota and does not call generateContent. No billing/logging/projectsettings change.

Add redacted structured server diagnostics for future provider failure: job/task identifiers, phase(category:transport/timeout/http/nonjson/jsonparse/translationvalidation/audiovalidation), knownHTTPstatus ifavailable, contenttypeJSONboolean only. Keep externally visible failed/unknown/quota semantics and uncertainty/resend safeguards unchanged. Do not log requestprompt/body, modelresponse, free-form exceptions, headers, key, URI or token. No generation just to populate logs; next generation needs explicit unknown-outcome resend approval and existingledger protocol.

Tests mock allnetwork: correct fixedmodelGET/auth/nooverride, RBAC/session, disabledadapter, cooldown/concurrency, timeout/redirect/oversize/nonJSON/malformedJSON, providererror not reflected, safe schema/output/log redaction. Existingproviderparse/security/retry tests must remain. Actualpreflight after reviewedPR/CI/merge/deploy gets explicit bounded execution approval; no liveprovidercall during implementation.

Benefit: distinguishes savedRenderkey/transport/modelmetadata from responseparsing without another generation and makes any later failure observable. Tradeoff: small new internaladminendpoint/logging behavior, requiring review/deploy.

## B — Defer hosted diagnostics

Keep jobfailed/receiptretained and no resend. Local200 does not establish rootcause; avoid credentialreset/modelreplacement/tolerance changes based only on speculation.

Choose A (Duyisolatedimplementation,Túreview) or B. Rule1MasterPrompt requires settling newAPI/runtime/diagnosticbehavior before code.1/80approvedpairs;viunaccepted.
