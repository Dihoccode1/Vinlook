# TASK025 — Translation validation reason verification

User approved isolated implementation/testing, then Tú review. No deployment or additional provider request is included.

The existing failure event now optionally contains validationReason from a fixed ten-value allowlist: blocked, candidate_count, finish_reason, role, part_count, part_shape, inner_json, object_shape, locale, text_shape. No provider strings, response/prompt text or credentials are logged. Error code remains PROVIDER_OUTCOME_UNKNOWN; only internal classification changes. Accepted response constraints, quota and retry behavior remain unchanged. Malformed null shapes now receive a classified ProviderFailure instead of an unclassified TypeError; both remain rejected.

Local command: node --test services/content/test/adapters.test.js services/content/test/preflight.test.js services/content/test/translation-validation.test.js

Result:23 tests passed,0 failed. Fixtures exercise all ten rejection reasons through parser and mocked transport, asserting one call, exact redacted event and unchanged external error. Accepted envelope metadata remains accepted; thought/thoughtSignature/tool metadata at part level remains rejected. These synthetic shapes are regression fixtures, not evidence of the actual live response. Existing preflight/transport/audio/config tests pass.

No live provider, Atlas, Cloudinary, worker or deployment operation performed. No database/API/configuration change. Actual retry cause remains unknown beyond translationvalidation until a future separately authorized response supplies the detailed reason.
