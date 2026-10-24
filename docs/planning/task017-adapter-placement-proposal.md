# TASK-017 — Adapter placement and MP3 conversion decision

Actual Issue [36](https://github.com/Dihoccode1/Vinlook/issues/36).

24October2026 UTC+7. User approved continuing to TASK017. This does not approve an unwritten schema/configuration/placement contract. Owner Tú (ngoctu0405), human reviewer Duy (Dihoccode1), unchanged. TASK003 and TASK016 code prerequisites merged; PR35 merge777a357e46cd9f03412b7ce7855854e8fa4f6545/Issue34closure verified. Old backlog title Gemini/Azure is historical: Azure was replaced by approved hybrid MMS + Gemini under DEC095–106. No Azure subscription setup resumes.

## Evidence refreshed before deciding

Official Google docs checked read-only24October2026:
- https://ai.google.dev/gemini-api/docs/speech-generation — Gemini3.8FlashTTS and unary WAV/24kHz mono16-bit PCM output; existing Vinlook research already generated4short outputs from this model/Kore.
- https://ai.google.dev/gemini-api/docs/pricing — Gemini3.5Flash-Lite has Standard free-tier input/output and is described for translation/data processing. Candidate translation model gemini-3.5-flash-lite, not yet project/runtime/quality accepted. Candidate TTS remains gemini-3.8-flash-tts/Kore rather than switching model without review.
- https://ai.google.dev/gemini-api/docs/structured-output — JSON Schema responses can be requested, but Vinlook must validate exact returned locale/text/version separately; formatting alone is not translation quality approval.
- https://ai.google.dev/gemini-api/docs/rate-limits — actual limits are project/model-specific; active limits must be rechecked in AI Studio. Do not reuse old3RPM/10RPD as current quota evidence or sum extra keys/accounts.

Earlier actual evidence:12immutable MMS checkpoint IDs resolved (research/tts-spike/mms-checkpoints.json), short English/Pidgin and longer English benchmarks,4short Gemini outputs, user approval of presented samples. No full16locale narration/qualified pronunciation/translation/product delivery acceptance. User reported credential rotation in DEC108; no replacement key inspected here. Current quota/free account status has NOT been rechecked through a key/API or account UI in this planning turn.

## Integration gap requiring a choice

Current TASK016 supports one audio-job result containing a verified MP3 media intent. It has no durable intermediate WAV artifact, conversion-only task or worker download handoff. Prior hybrid proposal placed Gemini calls in Content and WAV conversion in local worker; that intermediate handoff was explicitly left for further design. Merely returning WAV from an adapter would not complete the existing result/upload contract. Do not silently add a service, job type or storage collection.

## Options

| Option | Placement | Benefit | Cost / change |
|---|---|---|---|
| A — recommended | Content performs Gemini translation and4GeminiTTS locales, then bounded FFmpeg child converts returned WAV to MP3 in Content;12MMS locales stay local worker | Uses existing server_adapter audio jobs and verified MP3 result path; no intermediate artifact collection or new job kind; cloud key stays backend | Moves the previously proposed local Gemini-output conversion into Content; requires explicitly pinned FFmpeg runtime/packaging and actual Linux/Render resource verification before deployment |
| B | Content performs translation only; local worker handles all16audio locales, calling Gemini for4 and MMS for12, then local FFmpeg/MP3 upload | Reuses existing local_worker audio job/attempt protocol and keeps media conversion off Render | Moves GeminiTTS execution and its private key to local worker; worker needs that API key in addition to job credential; cloud audio depends on the local machine being active |
| C | Content GeminiTTS creates a durable intermediate WAV artifact; local worker downloads/converts/uploads and reports it | Retains previously proposed separation of cloud synthesis and local conversion | Needs explicit new artifact state/storage/authenticated transfer and conversion-stage job/lease design; more schema/failure/cleanup work |

Recommendation A is a proposal, not a measured Render feasibility result. It keeps the current three-service architecture, hybrid16locale split and caller scopes while avoiding an extra artifact workflow. Choose B if keeping all media conversion on the local machine takes priority. C is possible but needs a broader replacement contract. No option changes free-only, English source/offline,90–150s narration, human review or published history requirements. No claim that this choice alone meets35day/day5 delivery.

## Detailed contract after placement choice

Before any code, prepare the chosen concrete adapter/runtime contract: exact model/voice/locale-style registry and pinned transcoder/package artifact; explicit config/no-secret logging; disabled-by-default activation; one concurrent cloud synthesis; nonretrying fixed-host bounded REST transport; structured translation parsing; WAV/duration and MP3 validation; claim/renew/result integration; provider error/quota and ambiguous accepted-request handling; safe restart behavior so a lost provider response does not automatically cause a second synthesis; tests and real-account/hosted acceptance gates.

Use current job/outbox/media boundaries unless changes are explicitly approved. Real API/billing/key/Atlas/upload/deploy acceptance requires its own concrete authorized step; none is triggered by placement choice. Initial implementation/tests are to remain synthetic loopback. Actual model quota, translation/locale quality and Render/worker capacity remain to be checked. No paid fallback, unrelated account/key reuse, model substitution or real key printed/stored in docs.

## Requested decision

Choose A/B/C. Master Prompt Rule1 requires asking before deciding changes affecting architecture/technology/deployment. Earlier approvals of hybrid providers and TASK016 remain valid; this asks only where Gemini audio is converted/processed, a previously unresolved handoff. After selection, the detailed concrete contract is the next approval gate; no implementation/pinning has started in this planning turn.

## Placement decision recorded — 24 October 2026

User selected A: Gemini calls and FFmpeg conversion in Content; twelve MMS audio locales remain local. Placement is approved. Detailed proposed implementation contract: [task017-adapter-contract.md](task017-adapter-contract.md). Its new storage/API/config/packaging details await approval before code.
