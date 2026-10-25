# TASK025 — Translation Part metadata compatibility proposal

26October2026. User reports third authorized generation failed unknown. Direct Render log03:36:57UTC+7 confirms same Vietnamese job, translationvalidation, HTTP200 JSON, validationReason part_shape. Current predicate rejects a null part, non-string text or any property other than text. It does not reveal which specific field/type occurred. No additional request authorized or executed.

Official Google documentation states that thoughtSignature may accompany text parts: https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures ; official SDK Part definition: https://googleapis.github.io/js-genai/release_docs/interfaces/types.Part.html . A signature is a plausible compatibility issue, not a proven property of the discarded response.

Option A: implement a narrowly allowlisted text Part parser: require string text; optionally allow string thoughtSignature and boolean thought:false; reject thought:true, nonboolean thought, nonstring signature, unknown fields, tools/media, multiple parts, non-STOP or invalid inner JSON/locale/text. Ignore permitted metadata for this single-turn translation; never store/log its value. Preserve all content validation, quota and no-resend behavior. Add synthetic metadata fixtures and rejection tests. For remaining part_shape failures log only boolean shape flags (textIsString, signaturePresent, signatureIsString, thoughtPresent, thoughtIsFalse, unknownFieldPresent), no raw names or values. No schema/API/config/provider-request-body change.

Implement/test in isolation, then Tú review; no deploy or generation call in this scope. This fixes a documented interoperability gap without claiming it is the confirmed live field. Any subsequent deployment/live validation remains separately gated.

Option B: keep strict text-only parser and defer Vietnamese processing. No further generation.

Rule1 requires approval because this changes accepted response metadata. Existing receipts/unknown histories remain intact. TASK0251/80 approved pairs; no audio/publication.
