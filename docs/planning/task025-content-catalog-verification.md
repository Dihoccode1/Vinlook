# TASK025 full Content catalog verification

25 October 2026 UTC+7. User approved A: nine collections/nineteen declared indexes, implementation and isolated tests; Duy implements, Tú reviews.

## Change

Added separate Content catalog plan/apply CLI, deriving existing model factories with exact vinlook_content guard, explicit apply confirmation, bounded metadata/DDL/connection timeouts, sanitized URI/driver hints and finally cleanup. Full preflight rejects unexpected collections, incompatible/extra indexes and invalid projected POI mutationVersion before writes. Partial and geo definitions are handled explicitly. Final admission reuses unchanged verifyContentCatalog.

No schema/index/dependency/runtime-startup changes. CLI reuses existing tested interactive terminal prompt from the local monorepo Identity operator script, not Identity HTTP/runtime models. Google-DNS launcher changes only its own process resolver, permits plan/help and rejects apply until a later explicit live-plan decision. Visible URI entry follows the user preference and must not be shared in support output.

## Local verification

- Node v24.18.1. Eight catalog unit groups passed, covering manifest counts, guards, redaction, fixed driver hints, close-on-failure, read-only/conflict/POI-version checks, partial completion and actual CLI/launcher behavior.
- Content source/unit runner:54unit groups passed; shared health/authorization runner20groups passed. Script syntax checks passed. No destructive production methods were found in the catalog module/CLI/launcher.
- All nine Content disposable integration suite invocations passed using the existing pinned Mongo image and fresh labelled loopback replica sets. Adapters suite imports jobs tests as before; repeated groups are not distinct coverage.
- Seven new real catalog groups passed: plan left DB empty; actual apply created9collections/19indexes (completed28), passed verifyContentCatalog and reran completed0; both partial unique constraints enforced working states; 2dsphere served an actual GeoJSON near query.
- Extra collection preserved/rejected; invalid POI version blocked an earlier pending index without repairing the record; incompatible partial/geo indexes remained unchanged after refusal; duplicate records blocked a unique-index build and remained present; conflict in the last target blocked recreation of an earlier missing collection.
- Fixture-only drops/deletions/raw inserts were confined to the runner-verified disposable Mongo container; no caller-supplied URI or Atlas credentials were accepted. Synthetic partial DDL failure reported known completed count and an inspectable remaining plan, with no rollback deletion or automatic retry.

Backend CI now includes this catalog fixture, for17Identity+Content suite invocations across both jobs plus production image builds/smokes. Hosted success must be inspected on the exact PR head; local success alone does not establish that result.

## Remaining gates

No live Content URI read/entered, Atlas connection/write, Content Render service, new credential, provider call, model execution, upload or final audio pair was performed. Gemini stays disabled. TASK025 remains open0/80finalpairs. Request Tú review, merge successful CI, then authorize read-only live Content plan; exact apply remains a separate decision.

Reviewer commands and failure interpretation: docs/setup/task025-content-catalog.md.
