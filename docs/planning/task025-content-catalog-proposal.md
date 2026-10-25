# TASK025 Content catalog utility proposal

25 October 2026 UTC+7. Identity is Live at https://vinlook-identity.onrender.com. Duy implements; Tú reviews, unchanged. No Content service or catalog has been provisioned by this proposal.

## Current source requirements

The approved model declarations compile without connecting or creating data. Full Content catalog comprises nine collections and nineteen declared indexes (plus default Mongo _id indexes):

| Collection | Declared indexes |
| --- | ---: |
| pois | 1 |
| poi_revisions | 4 |
| localized_contents | 1 |
| audit_outboxes | 2 |
| idempotency_records | 1 |
| media_uploads | 3 |
| processing_jobs | 4 |
| provider_calls | 2 |
| provider_controls | 1 |

Includes one 2dsphere index and two partial unique indexes. Identity's provisioner rejects partial indexes and validates a different DB/catalog, so it must not be pointed at Content. Existing verifyContentCatalog rejects unexpected collections/options and requires nonnegative safe-integer POI mutationVersion values. It does not repair existing data.

Runtime discovers media/job/provider collections even when their optional adapters are disabled. All nine collections therefore can be provisioned without activating Gemini, media upload or local worker execution. Declared provider collections alone do not authorize provider calls.

## A — full declared catalog, recommended

Implement a separate local Content CLI with no new dependencies, deriving all nine model declarations directly from existing factories. No schema/index/runtime-verifier changes. Only `/vinlook_content` is accepted; no test/Identity DB override. Default command is a read-only plan. `--apply` additionally requires exact database confirmation and creates missing approved collection/index entries only.

Inspect the entire database catalog before the first write. Unexpected collections, collection options/types, extra/conflicting indexes or index-name collisions stop apply. Support the existing partialFilterExpression definitions and server metadata for the declared 2dsphere index without accepting arbitrary index options. Reuse existing verifyContentCatalog at the end. Before writes, check existing POI mutationVersion via the minimal projection used by the runtime; report only a fixed migration-required code if invalid, not row IDs/values. Never repair/migrate POI data.

No drop, rename, syncIndexes, seed, role/network change, media upload or account bootstrap. Do not silently convert unique/partial/geospatial indexes. DDL is nontransactional: report known completed steps and incomplete status on failure, never delete partial results to roll back, and do not auto-retry an uncertain operation. Reinspect catalog before individual operations and stop on conflicts; concurrent external administrators remain unsupported.

Reuse sanitized URI/driver diagnostics and bounded connect/socket/catalog-operation timeouts. Keep URI only in process memory; no URI argv/env/file or raw driver errors. At the user's visible-input preference, URI echo must be explicitly labelled as including credentials and never copied to evidence/screenshots. Reuse existing prompt implementation; do not alter operator-password behavior.

Provide a separate process-scoped Google-DNS launcher for the known local resolver issue, leaving Windows DNS/Atlas networking unchanged. Initially permit only plan/help; enabling live apply requires the exact successful live plan and explicit authorization, as with Identity.

### Isolated verification in this approval

- Unit coverage: wrong DB/flags/confirmation rejected before connecting; diagnostics redacted; read-only plan; whole-catalog conflicts stop before writes; bounded partial-failure reporting; projected POI version gate.
- Fresh digest-pinned labelled Docker replica-set fixture with inspect-derived loopback URI. No caller-supplied Atlas URI, no live credentials accepted by tests.
- Actual full apply creates nine collections/nineteen indexes and passes verifyContentCatalog, including 2dsphere and both partial unique indexes. Plan leaves fresh DB empty; rerun writes nothing.
- Extra collection, incompatible partial/geo/unique index, invalid POI version and unique-index build failure do not trigger repair/deletion. Existing valid records remain unchanged.
- Add the fixture to backend CI; full reviewed-commit CI must pass before merge. Request Tú review with commands/checklist.

Approval A covers implementation and isolated tests only. Live read-only preflight follows review/merge and user entry of the Content-owned URI. Exact live apply needs separate confirmation after that plan. No Atlas write or Content Render deployment yet. Gemini remains disabled; no API key/provider cap/binary adapter settings enabled by this change.

## B — stage core catalog first

Implement the same guarded utility for only the five core POI/outbox/idempotency collections (nine declared indexes), leaving media/job/provider collections for a later reviewed expansion. This permits an initial DB-backed Content runtime with optional features unavailable, but adds a later catalog-admission step before TASK025 processing. It must not be reported as full Content/audio readiness.

## Decision

Choose A full nine-collection utility, or B core-five-first. This decision concerns the new provisioning mechanism and admission order under Master Prompt Rule1; the model declarations and Duy/Tú assignment are already fixed. TASK025 stays open, 0/80 final pairs.

## Approval recorded

25 October 2026 UTC+7: user selected A — all nine collections/nineteen indexes. Implement and verify using disposable Mongo only, then Tú review. Live preflight/apply and Content deployment remain separate setup steps.
