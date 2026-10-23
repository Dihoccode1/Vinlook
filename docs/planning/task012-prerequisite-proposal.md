# TASK-012 prerequisite sequencing proposal

23 October 2026. Actual Issue [24](https://github.com/Dihoccode1/Vinlook/issues/24). Status: proposed, awaiting decision. Owner Duy; reviewer Tú, unchanged for TASK-012 and TASK-015.

## Current state and evidence

TASK-007 and TASK-011 merged; TASK-011 Issue22 closed. TASK-012 backlog lists only those dependencies. However approved design-api-proposal.md section5 requires content mutation plus audit outbox in one Content transaction and Idempotency-Key for POI creation. TASK-008 implements only the receiving Identity API. TASK-011 intentionally implements only three business models, not AuditOutbox or IdempotencyRecord. TASK-015 owns durable outbox delivery, mutation idempotency and recovery; its own dependencies TASK-008/TASK-011/TASK-007 are already merged. There is no dependency cycle.

## Proposed A (recommended)

Implement/review/merge TASK-015 before implementing TASK-012. Add TASK-015 as a TASK-012 prerequisite after approval. First prepare a concrete TASK-015 contract covering existing approved Outbox/Idempotency fields, exact indexes, transaction API, canonical request comparison, 24h replay, in_progress recovery, sender acknowledgement/retry/timeout/shutdown behavior and failure tests. Approve missing details before code. Then return to TASK-012 concrete endpoint/version/invalidation contract, implementation and tests. Do not create a temporary best-effort audit writer or expose incomplete mutation endpoints.

## Alternative B

Keep TASK-012 as the current design task: finish its API contract first, but defer implementation/integration until TASK-015 is approved and merged. This preserves contract preparation order but does not remove the underlying implementation prerequisite. No option waives durable audit/idempotency requirements.

## Impact

Only implementation sequence/dependency changes. No product requirement, approved architecture, existing model, assignment, free-service constraint or deadline change. TASK-015 was already planned (8h estimate, not newly added scope); moving it forward does not prove the fixed checkpoint schedule is achievable. TASK-012 remains NOT READY for implementation until prerequisites and its concrete contract are approved. TASK-015 implementation needs its own actual Issue and approved contract; this sequencing approval alone does not approve unspecified fields/configuration. No product code, new model/index, Atlas write, seed or provider operation occurs in this proposal.

Traceability: REQ-014/018/019, FEAT-004/005, UC-012/026, TASK-008/011/012/015; source product-backlog.md and approved design-api-proposal.md / design-data-catalog.md. Acceptance: later tests must prove content/outbox/replay result rollback together, safe retry after ambiguous responses/restart, no duplicate receiver audit event and one-winner expectedEditVersion updates.

## Decision needed

A: TASK-015 first, then TASK-012. B: finish TASK-012 contract first, then TASK-015 implementation prerequisite. Master Prompt Rule1 requires approval for the previously omitted dependency/sequence; its words are “ảnh hưởng architecture”, “ảnh hưởng thời gian” and “PHẢI HỎI TÔI trước khi quyết định”. This does not reopen TASK-011 approval.

Approval23October2026: user selected A — TASK-015 before TASK-012. Concrete TASK-015 contract approval still required.
