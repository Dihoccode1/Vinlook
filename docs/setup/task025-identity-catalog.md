# Identity catalog utility — TASK025

This is a separate local operator tool. HTTP services still never provision their catalog on startup. No dependency, schema, account or index declaration is changed. Duy implements; Tú reviews.

## Authorization and use

User approved implementation and isolated Docker tests only. Do not connect this utility to Atlas until a separate read-only live preflight is authorized. Review its result before authorizing any live `--apply`. Keep the URI/password out of chat, environment files committed to Git, command arguments and logs. The URI prompt requires an interactive TTY and does not echo input; redirected stdin fails closed. It accepts a single-seed Mongo URI or SRV URI with the exact database path `/vinlook_identity`.

From repository root, using the pinned Node/npm runtime and installed locked dependencies:

```text
node services/identity/scripts/catalog.js --help
node services/identity/scripts/catalog.js
node services/identity/scripts/catalog.js --apply
```

The second command defaults to read-only plan. The third additionally asks you to type exactly `vinlook_identity` before connecting. Enter the intended URI only at the hidden prompt. There is no URI argument, automatic environment-secret lookup, test-database override or force/repair mode.

## Catalog behavior

Declarations come directly from `createIdentityModels`: five collections and eight declared indexes plus each ordinary Mongo `_id` index. Plan lists only missing model-owned collections/indexes and a complete flag. It reads collection/index metadata, never account documents. Unrelated collections are ignored.

Apply inspects all five target collections before its first write. Conflicting collection options/types, unexpected/duplicate/incompatible indexes or index-name collisions stop it. It creates only missing collections/indexes, reinspects before each operation, and finishes with the existing `verifyIdentityIndexes` gate. A completed rerun writes nothing. It never drops/renames collections/indexes, changes options, seeds accounts, bootstraps Manager, changes network access or repairs mismatches. A unique-index build can fail on existing duplicates; the tool leaves documents intact and reports failure.

Connection establishment is bounded to five seconds; socket operations to 45 seconds, metadata calls to ten seconds and create operations to 30 seconds. Connections close in finally. Public output is model-derived plan data, completion counts or fixed sanitized error codes; no driver/provider errors or URI are printed. A close failure prevents a success result.

DDL is not transactional. An interrupted or failed apply can leave completed catalog entries; it reports `status: incomplete` and the known completed count. It does not undo writes by deleting them. Inspect a new read-only plan before deciding to resume. Do not run concurrent catalog administrators: repeated inspection narrows but cannot eliminate a race between inspection and DDL. An unknown-outcome error is not retried automatically.

## Isolated tests and reviewer checklist

`node --test services/identity/test/catalog.test.js` covers URI/argument/confirmation guards, redirected secret input, sanitized connection failures, read-only plan, all-target conflict checks and partial completion. `node scripts/ci-service-integration.mjs identity` also launches the new catalog suite in a fresh labelled, digest-pinned Mongo replica set and removes only that runner-created container. The fixture derives its loopback URI from Docker inspect and refuses caller-supplied DB URIs. It uses the production database name only inside this disposable container to exercise the CLI's strict guard.

Tú should check no destructive command exists in production utility, default plan makes no writes, the final target's conflict blocks earlier missing-target creation, exact catalog verification passes after apply, rerun is a no-op, and existing documents/unrelated collections remain unchanged. Fixture-only drops/inserts are confined to the verified disposable container.

No live credential, Atlas connection, Render service creation, provider request, upload or final audio pair is included. TASK025 remains open, 0/80 final pairs.
