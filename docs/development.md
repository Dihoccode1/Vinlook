# Running the TASK-002 scaffold

Use Node **24.18.1** and npm **11.16.0**. `.nvmrc`, `.node-version`, root engines and the preinstall check pin this runtime. This does not establish a Docker or hosted CI runtime yet.

From the repository root:

```sh
npm ci
npm run dev
npm run build
npm run check:scaffold
npm run test:runtime
```

Frontend dev runs at `http://127.0.0.1:5173`. Start each backend in a separate terminal:

```sh
npm start --workspace=@vinlook/identity
npm start --workspace=@vinlook/content
npm start --workspace=@vinlook/usage
```

Development defaults are localhost ports 3001, 3002 and 3003 respectively. Stop a terminal with Ctrl+C. TASK-003 validates NODE_ENV/HOST/PORT before listening and provides the minimal health routes below. Business and protected monitoring endpoints remain404. This is not a deployed production service.

## Runtime configuration and minimal health

Start/dev reads an optional `.env` in the service directory through Node's native env-file flag. Copy only the nonsecret settings from that service's `.env.example` if needed; shell/hosting values take precedence. Never put a real `.env` into Git or use a frontend env variable for backend credentials.

NODE_ENV permits development/test/production (default development). HOST defaults127.0.0.1 in dev/test. PORT defaults3001/3002/3003 in dev/test and must be an integer1–65535. Production requires explicit HOST=0.0.0.0 and PORT; do not infer production just from a hosting hostname. Invalid settings stop startup with field names and no values. The process config deliberately returns only these consumed nonsecret fields; database/auth/provider required config belongs to those actual implementation tasks.

GET `/health/live` returns200 `{data:{status:"up"},requestId}`. GET `/health/ready` deliberately returns503 `{error:{code:"DEPENDENCIES_UNVERIFIED",message:"Service dependencies are not verified",requestId}}` until actual owned dependencies are implemented and checked. Both return Cache-Control:no-store and a server-generated UUID, without echoing the caller's ID. A live process is not a ready product. Do not use these endpoints to keep Render awake.

Protected `/monitoring/health` and `/monitoring/jobs` remain404 until staff auth and the actual monitoring feature exist. No dependency polling, DB/provider details or cross-service DB credentials are exposed. D-017 freshness/timeouts remain contracts for later real dependency checks; no timer makes an unimplemented dependency healthy.

The scaffold smoke check starts all three apps concurrently on OS-assigned ports, verifies HTTP404 for unimplemented paths and no framework header, then closes them. The runtime suite checks defaults, missing/invalid production inputs, pre-listen startup failure, sentinel redaction and truthful health responses. Neither verifies authentication, database access, provider availability, network isolation, hosted lifecycle or signal delivery on Linux. Backend build checks ESM syntax; there is no transpilation.

## Structure

| Unit | Responsibility |
|---|---|
| apps/web | React19/Vite SPA, React Router Data Mode, Tailwind4 |
| services/identity | Identity and staff management boundary |
| services/content | POI, publication, content jobs and provider adapters boundary |
| services/usage | Anonymous usage and monitoring boundary |
| workers/mms | Reserved local Python worker boundary; no runtime implementation yet |

No shared database access, gateway, message broker or fourth hosted backend is introduced. Identity now has service-owned model declarations and synthetic tests, but server startup does not connect to a database. There are no secrets, actual provider clients or fake feature-success endpoints. shadcn component location and the `@` alias are reserved; no unused component dependency is installed. The initial page is an explicitly unavailable guide preview, not final approved UI acceptance.

Identity model checks: `npm run test:identity`. Real isolated Mongo index checks: `npm run test:identity:db` after creating the explicitly guarded disposable environment in [TASK-004 evidence](planning/task004-implementation-evidence.md). The integration suite refuses arbitrary URIs or an existing test database; no Atlas credential is needed. See [model boundaries](../services/identity/src/models/README.md) before adding write APIs.

Install versions are exact in workspace package files, and transitive versions/integrities are locked in package-lock.json. Use `npm ci` to reproduce them; don't copy node_modules. No product Python dependencies are installed by npm; the separate research virtualenv is excluded from publication.

Hosted runtime checks, Docker Compose, GitHub Actions, CI/CD, real dependency readiness, product features and full mobile/browser acceptance remain later tracked work. Passed scaffold/runtime checks are not MVP completion.
