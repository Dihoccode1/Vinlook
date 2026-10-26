# Identity/Content service readiness

Owner Duy;27October2026. Separate from full PoC/content/worker acceptance.

Production runtimes expose readiness only after their existing startup configuration,
catalog verification and initialization succeed (including Identity session reconciliation,
Content configured media/adapter initialization and binary checks). Each readiness read
checks Mongo connection, ping and writable replica-set primary within a shared3s budget.
Concurrent reads share one probe; no polling, provider call, data write or catalog repair.

`GET /health/ready`:200 `{data:{status:"ready"},requestId}` when ready; otherwise the existing
503 DEPENDENCIES_UNVERIFIED envelope. Cache-Control no-store, no DB/key/provider details.
Liveness stays independent. An unconfigured/injected runtime without an explicit ready
probe remains503; tests must not infer production readiness from a fake runtime.

This certifies the configured service can use its own currently reachable Mongo primary,
with schema verified at startup. It does not promise all240locale pairs, valid map artifact,
live local worker, cloud-provider quota, frontend readiness, or detect arbitrary post-startup
schema changes without restarting. No external keepalive or provider generation is added.

Focused unit/HTTP checks cover primary loss, connection loss, probe errors, shared inflight,
200/503 envelopes and redaction. Existing Identity process-start integration tests now expect
200 after actual verified startup. Docker/Mongo CI is required separately before deploy.
