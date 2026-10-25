# Content catalog utility — TASK025

Duy implements; Tú reviews. User approved A: the complete existing nine-collection/nineteen-index declaration, implementation and isolated tests only. Do not connect to Atlas until live read-only preflight is separately authorized; review its exact result before authorizing any apply.

## Commands

From repository root with the pinned Node/npm runtime and locked monorepo dependencies installed:

```text
node services/content/scripts/catalog.js --help
node services/content/scripts/catalog.js
node services/content/scripts/catalog.js --apply
node services/content/scripts/catalog-dns-google.js
```

Default is read-only plan. The normal CLI supports apply only after `--apply` and typing exactly `vinlook_content`. Google-DNS launcher is process-scoped and permits only plan/help in this approval; it refuses apply and never changes Windows DNS. Do not point the Identity catalog utility at Content.

Use the Content-owned Mongo user and exact `/vinlook_content` path, immediately before `?` or at URI end. URI must be one line with no wrapping quotes/placeholders/whitespace; encode special credential characters. At the user's explicit input-visibility preference, the terminal echoes the full URI including credentials. Do not send that line/screenshot in chat or put it in files/arguments/environment values for this utility. Share only the sanitized JSON output. Redirected stdin fails closed using the existing tested interactive prompt. The local CLI reuses that prompt from the Identity operator script; it does not call the Identity service or reuse Identity DB models/credentials. CLI scripts are not copied into production images.

## Scope and failure behavior

Models derive directly from existing Content/ durability/ media/ job/ adapter factories. Five core collections, media_uploads, processing_jobs, provider_calls and provider_controls make nine collections; nineteen declared indexes include one 2dsphere index and two partial unique indexes. Mongo default `_id` indexes are additional. Missing everything yields 28 planned operations. This is a projection, not evidence of the live database's current state.

The entire collection/index catalog is inspected before writes; unexpected collections/options, incompatible/extra/duplicate indexes, name collisions and invalid POI mutationVersion values stop apply. Unlike Identity, Content's existing runtime rejects unrelated collections, so the utility does too. It reads only POI mutationVersion via a minimal projection for this data gate, never translates/reads narration or repairs data. Invalid versions require a separately reviewed migration; no row IDs/values are emitted.

Partial filters match existing declarations exactly. Only declared geo index metadata is accepted. Apply creates missing ordinary collections/indexes, reinspects before each operation and finishes using the existing verifyContentCatalog gate. It never drops/renames/syncs/repairs, changes validators/roles/networking, seeds POIs or accounts, uploads media or calls a provider. An existing duplicate can prevent a unique-index build; documents remain untouched.

DDL is not transactional. Completed steps remain on interruption/failure; incomplete errors report the known completed count. Inspect another plan before deciding to resume. No automatic retry of uncertain outcomes or deletion to roll back partial work. Avoid concurrent catalog administrators: repeated inspection narrows, but cannot remove, the race between inspection and DDL.

Connect/server selection:5seconds; socket:45seconds; metadata/version scan:10seconds; individual create:30seconds. Connections/cursors close in finally. Errors expose only fixed categories, such as AUTHENTICATION_FAILED, DATABASE_PERMISSION_DENIED, DNS_LOOKUP_FAILED, CONNECTION_UNREACHABLE_OR_TIMEOUT, EXISTING_DATA_PREVENTS_UNIQUE_INDEX, or CATALOG_DATA_MIGRATION_REQUIRED; no driver messages, URI or document values. These hints do not authorize widening access or disabling TLS.

## Review and isolated verification

```text
node --test services/content/test/catalog.test.js
node scripts/ci-service-checks.mjs content
node scripts/ci-service-integration.mjs content
```

The integration runner creates a fresh labelled, digest-pinned Mongo replica-set container, derives its loopback URI from Docker inspect, verifies replica identity/empty DB, then removes only that runner-created container. The production DB name is used solely inside this disposable fixture to exercise the strict guard. Tests reject arbitrary caller-supplied Mongo/Atlas URIs.

Tú: check default no-write behavior, exact DB guard, all-target conflict blocking, partial failure counts, no destructive production path, and no credential output. Fixture-only raw inserts/index drops/record deletions test failure scenarios inside that verified disposable container. Real index tests must enforce both working-state unique constraints and serve a GeoJSON near query. Changed existing indexes/documents must remain unchanged after refusal. Full apply must pass the unchanged runtime verifier and rerun with zero operations.

Schema declarations, runtime startup and provider configuration are unchanged. Provider collections can exist while Gemini remains disabled. No Content service, real key/model execution, Atlas catalog write or final audio pair is authorized by this implementation/test approval. Keep TASK025 open, 0/80 final pairs.
