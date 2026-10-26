# Backend module structure

The deployed service boundaries remain `services/identity`, `services/content` and
`services/usage`. These paths are already configured in Render, Docker Compose and CI.
The sample auth/user/product/order layout is adapted to Vinlook's actual domains; no
unneeded gateway or empty service is introduced.

```text
services/
  identity/src/
    config/{env,database}.js
    modules/auth/auth.{route,controller,service,repository,model,validation,dto}.js
    middlewares/{auth,error,validate}.middleware.js
    utils/{AppError,schema-options}.js
    app.js
    server.js
  content/src/
    config/{env,database}.js
    modules/pois/poi.{route,controller,service,repository,model,validation,dto}.js
    drafts/router.js                  # existing API composition and error boundary
    publication/, lifecycle/          # existing bounded domain modules
    media/, jobs/, adapters/, durability/
    app.js
    server.js
  usage/src/
    config/{env,database}.js
    modules/usage/usage.{route,controller,service,repository,model,validation,dto,policy}.js
    app.js
    server.js
```

## Responsibilities

- Routes bind existing HTTP methods/paths and middleware in their original order.
- Controllers parse HTTP inputs and select the service operation and response envelope.
- Services apply business rules. Auth keeps bcrypt cost12, dummy-hash comparison,
  account status checks, JWT claims and rate budgets. Usage keeps the distinct-browser
  and playback lifecycle semantics.
- Repositories own account queries, POI read queries and the Usage transaction store.
  POI writes intentionally retain the established transaction coordinator in the service:
  mutation version, outbox and replay results must commit together. A repository extraction
  must not move those writes into separate transactions.
- DTOs define outward-facing data and timestamp conversion. Password hashes never enter
  authentication DTOs. Schema factories remain disconnected with auto-create/index disabled.
- `config/env.js` validates runtime environment; `config/database.js` composes connections,
  verified catalogs and runtime dependencies. Configuration never repairs a production catalog.
- Middleware keeps safe error translation, CORS, body limits and authorization boundaries.
  Domain-specific failure types remain intact instead of forcing different contracts into one error class.

## Compatibility

Old imports such as `auth/router.js`, `drafts/service.js`, `models/index.js`, `http.js`
and `config.js` are deliberate re-exports, not duplicate implementations. They preserve
operator tools, tests and existing consumers while application wiring uses the new modules.
Do not add new business logic to these compatibility files.

Staff, recovery, audit, session and internal authorization routers in Identity remain mounted
independently. POI extraction preserves its five routes and every sibling Content router.
No HTTP route, environment variable, secret, collection, index, model profile or service URL changes.
The `.env` files stay local and ignored; only existing `.env.example` files belong in Git.

## Verification and deployment

Run `npm run check:code`, backend unit suites, `npm run check:scaffold` and the existing
disposable Mongo integration runner for relevant service changes. The integration runner
creates labelled temporary replica sets; it does not use Atlas. Auth's new contract tests
cover registration, active/inactive login, DTO privacy, rate limits, CORS and parser errors.
POI contracts cover all five route signatures, versions, locale restrictions and read flags.

Dockerfile paths, `src/server.js`, Compose and Render settings stay valid. A direct push to
`codex/poc-demo` is a source update, not evidence that manually gated production services
have already deployed that commit. Deploy the exact commit after the existing CI passes.
