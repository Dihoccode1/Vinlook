# TASK025 — Translation validation diagnostics proposal

26 October 2026. User reports the authorized single retry of Vietnamese job6ade5d64ed55df265fc8ede0 dispatched then failed PROVIDER_OUTCOME_UNKNOWN. Agent read Render application log03:20:21UTC+7 on PR67 instance: event gemini_provider_failure, taskType translation, category translationvalidation, httpStatus200, jsonContentType true, same jobId. This identifies response validation as the failure stage for this retry. It does not identify which predicate failed or establish the first attempt's cause.

Current parseTranslation requires exactly one candidate, STOP, model role, one part with text as its only property, parseable inner JSON with exactly languageCode/text, matching locale and bounded nonempty text. Existing log does not distinguish these conditions, and the provider body was not retained. Do not infer metadata fields, blocked content or truncation as the actual cause.

Option A (recommended): add fixed internal validation reason codes for candidate/block/finish/role/part-shape/inner-JSON/locale/text-shape failures, propagated into the existing redacted failure event. Log only fixed enum reasons, no response text, prompt, key or arbitrary provider strings. Keep parser acceptance, external error codes, quota, unknown-outcome and no-retry behavior unchanged. Add isolated fixtures for each rejection plus known optional-metadata shapes to document current behavior. No DB/schema/index, public API or configuration change. Implement and test in isolation, submit for Tú review, then separately authorize deployment. No actual provider request in this scope.

Option B: keep existing diagnostics and pause Vietnamese processing. No additional provider request.

Approval of A does not authorize relaxing validation, deploying, or a third generation request. More detailed diagnostics can classify a future authorized response, but cannot reconstruct the discarded past response. Any parser behavior change needs supporting provider documentation/fixtures and a separate concrete decision.

Original and retry receipts/ledgers remain intact; no audio worker, upload or publication executed. TASK0251/80 approved pairs.
