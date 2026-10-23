# Running the TASK-002 scaffold

Use Node **24.18.1** and npm **11.16.0**. `.nvmrc`, `.node-version`, root engines and the preinstall check pin this runtime. This does not establish a Docker or hosted CI runtime yet.

From the repository root:

```sh
npm ci
npm run dev
npm run build
npm run check:scaffold
```

Frontend dev runs at `http://127.0.0.1:5173`. Start each backend in a separate terminal:

```sh
npm start --workspace=@vinlook/identity
npm start --workspace=@vinlook/content
npm start --workspace=@vinlook/usage
```

These development-only listeners use ports 3001, 3002 and 3003 respectively on localhost. Stop a terminal with Ctrl+C. The services deliberately return 404 for all paths: business endpoints and the approved health/config contract are not implemented here. Port/host/env validation and deployment commands belong to TASK-003 and deployment tasks. Do not deploy this localhost-only scaffold directly to Render.

The smoke check starts all three real listeners concurrently on OS-assigned ports, verifies HTTP404 and no framework header, then closes them. It does not test authentication, database access, provider availability, network isolation, hosted lifecycle or signal delivery on Linux. Backend build checks ESM syntax; there is no transpilation.

## Structure

| Unit | Responsibility |
|---|---|
| apps/web | React19/Vite SPA, React Router Data Mode, Tailwind4 |
| services/identity | Identity and staff management boundary |
| services/content | POI, publication, content jobs and provider adapters boundary |
| services/usage | Anonymous usage and monitoring boundary |
| workers/mms | Reserved local Python worker boundary; no runtime implementation yet |

No shared database access, gateway, message broker or fourth hosted backend is introduced. There are no secrets, actual provider clients, persistence models or fake feature-success endpoints. shadcn component location and the `@` alias are reserved; no unused component dependency is installed. The initial page is an explicitly unavailable guide preview, not final approved UI acceptance.

Install versions are exact in workspace package files, and transitive versions/integrities are locked in package-lock.json. Use `npm ci` to reproduce them; don't copy node_modules. No product Python dependencies are installed by npm; the separate research virtualenv is excluded from publication.

Runtime/hosting checks, Docker Compose, GitHub Actions, CI/CD, all product features and full mobile/browser acceptance remain later tracked work. A passed scaffold check is not MVP completion.
