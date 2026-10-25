# TASK025 — Typed Part metadata verification

Approved isolated implementation: accept string text with optional string thoughtSignature and thought:false. Ignore these metadata values; return translated text only. Reject thought:true, invalid metadata types, unknown/tool/media fields and nonobject parts. Existing candidate/STOP/role/part count and exact inner JSON/locale/text bounds remain unchanged. No request-body, schema, API, config, quota or retry change.

Rejected part shapes emit only six fixed boolean flags in the existing redacted failure event. No field names, response text, signature values, prompts or credentials are logged. External unknown-outcome behavior is retained.

Local command: node --test services/content/test/adapters.test.js services/content/test/preflight.test.js services/content/test/translation-validation.test.js

Result:25 passed,0 failed. Tests cover valid metadata combinations, unchanged content/locale rejection, invalid types/thought/tool/media/unknown fields, null/array parts, exact boolean redaction and one mocked request with translated-text-only success. All provider calls are mocked; no real Gemini, Atlas, Cloudinary, worker or deployment used.

The live third attempt is confirmed only as part_shape. Synthetic signature fixtures demonstrate documented compatibility, not proof of the discarded response field. Review and separately approved deployment/live validation still required. Official references are in the accompanying proposal.
