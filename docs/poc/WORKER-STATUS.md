# Worker activity evidence

Duy approved27October2026: no idle heartbeat, no new index/backfill.
ProcessingJob.workerObservedAt is a nullable timestamp, written only by admitted
local-worker claim/renew/result operations in their existing transaction. Manager
upload recovery, staff processing and server adapter calls do not refresh it.
Duplicate accepted result receipts preserve the original timestamp.

Content jobs summary includes worker.lastObservedAt: latest stored local-worker
activity across jobs (not a derived lease timestamp). Legacy jobs return null.
The query uses the existing3s snapshot budget; there is no added index and large
datasets may fail unavailable rather than silently return incomplete evidence.

Usage joins concurrent jobs/worker-health bridge reads. Last observation less than
180s old means up; at180s it becomes stale even if the HTTP reply is fresh. No
observations means unknown; upstream failure means unavailable. No cloud keepalive
or local worker execution is started by this code. Browser counts stay separate.

Rolling deployment: Usage first (accepts old counts-only Content), then Content.
Old Usage rejects the new Content response fields, so reversing that order causes
temporary unavailable jobs. Both use the existing dedicated caller key pair.
Code rollback follows the same compatibility ordering. No Atlas migration needed.

Tests: helper admission/Manager exclusion, unknown/up/stale boundaries, concurrent
bridge read, existing sampler error guards, and real Content job claim/renew
assertions in disposable Mongo CI. Local fixtures are not live worker acceptance.
An authorized real processing job is needed before a hosted up observation can be
claimed. Full15POI/16locale/navigation/device acceptance remains separate.
