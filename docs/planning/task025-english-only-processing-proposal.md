# TASK025 — Bounded English processing prerequisite

26 October 2026 UTC+7. User approves preparation of English/audio/media canary for existing POI001 unpublished draft. Source inspection finds two actual blockers: connectContentRuntime assigns processingManifest only when Gemini adapters are enabled; createJobService.process iterates all16 languageCodes, and processInput currently accepts only expectedEditVersion. Calling current Process with Gemini false fails JOB_CONFIGURATION_UNAVAILABLE; turning Gemini on would expand setup and does not restrict job creation.

## A — Minimal English-only prerequisite (recommended)

Expose existing frozen processingManifest to job runtime when the dedicated local worker is configured, independently of Gemini. Provider runner remains disabled; do not enable cloud calls, provider config or publication verification as a side effect. Preserve existing registry pins.

Add optional languages to processInput: nonempty unique array of existing language codes, maximum16. Omitted retains existing all-language semantics for compatibility. Process iterates selected languages when supplied. Include selection in existing request hash/idempotency input; same key with a different selection conflicts. This permits selecting en only without direct DB insertion or separate canary backdoor. Non-English execution still depends on existing configured executors; this change does not authorize its live use.

No schema/index/dependency changes. Test on isolated Mongo: Gemini disabled plus configured worker can queue English; selected en creates exactly one audio job, no translations; omission preserves current behavior, invalid/duplicate locale lists fail; changed selection with same idempotency key conflicts; worker claim/result and existing source/version guards stay effective. Docker startup regression verifies worker-only config does not require Gemini secrets. Duy implements; Tú reviews; PR/CI/merge before deploying.

This decision authorizes implementation and isolated tests only. Following review/merge, exact CI-passed deployment and live one-job execution get a concrete separate plan. Future canary must bind POI001/revision/source versions, one worker run --once/en, bounded CPU/time, verified existing English cache, durable private journal, and Cloudinary audio upload through Content. No automatic retry, other POI/language batch, Gemini call or publication.

## B — Keep current API, configure Gemini and queue all languages

Requires cloud activation/free-tier revalidation and authorizes16initial jobs (English audio plus15translations) even if only English is executed now. Larger live setup and dormant queue; does not meet the proposed exact one-job bound. No recommendation to bypass runtime via direct DB edits.

Rule1 Master Prompt requires user selection before changing API/runtime behavior. Current canary approval is retained but does not silently authorize these missing technical choices. TASK0250/80finalpairs.
