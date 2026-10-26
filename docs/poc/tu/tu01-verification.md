# TU01 handoff and verification

Refs #70. Status: implementation of the **contract/fixture review candidate** done;
Duy shared-contract approval, review, merge and acceptance remain pending. No new
Usage endpoint or real graph/offline product is claimed. Work starts from
`f8058292169d994ae75116b078e3103cded34018` on `codex/poc-tu-01-contracts` in a fresh
clone of Dihoccode1/Vinlook. Existing user's checkout is preserved. No AGENTS.md
found in clone; ownership/START-HERE/review rules read before editing.

## Deliverables and ownership

- `docs/poc/tu/usage-contract.md`: approved/missing inventory, proposed wire response,
  error/config/CORS/schema/index/admission/rate/order details; U1–U4 require Duy.
- `docs/poc/tu/routing-package-contract.md`: approved navigation/offline baseline,
  proposed Worker/graph/chunk/manifest bridge, source/coverage and update gates;
  R1–R3 require Duy. Exact binary header/profile is not silently frozen.
- `services/usage/test/fixtures/poc-usage.mjs` and `poc-usage-contract.test.mjs`:
  explicit test-only semantic adapter and 13 deterministic tests.
- `packages/poc-routing/test/fixtures/poc-routing.mjs` and
  `poc-routing-contract.test.mjs`: explicit synthetic package/message/navigation
  oracles and 8 deterministic tests. They neither import graph data nor calculate
  routes; manifest hashes prove only synthetic fixture bytes.

No shared docs, apps/web, dependency/lock, business runtime or workflow changed.
No database migration or consumed environment variables added. Future proposed
environment **names** are documented, with no private values.

## Executed locally, Windows, 26 October 2026 UTC+7

Pinned Node24.18.1/npm11.16.0 downloaded to an untracked tools directory outside the
clone; machine/global runtime unchanged. Node ZIP SHA256 matched official
nodejs.org/dist/v24.18.1/SHASUMS256.txt:
`ec56b84a7551893ab2324ebdfdc4ab974a63b4781162600b68a1293cc3e53765`.

| Command (repo root, pinned runtime in PATH) | Observed result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Success; preinstall runtime guard passes; lock unchanged. npm warns bcrypt install-script approval not covered; no manual approval/lock edit performed |
| `npm run build` | All workspaces pass, including web preview build; not proof of a finished frontend |
| `node --test services/usage/test/poc-usage-contract.test.mjs packages/poc-routing/test/poc-routing-contract.test.mjs` | 21/21 pass, zero skipped |
| `npm run check:scaffold` | Initial sandbox run failed EACCES loopback; rerun outside sandbox passes independent Identity/Content/Usage HTTP listeners and closure |
| `node --test tests/authorization.test.mjs` | Initial sandbox run 3 pass/2 fail due blocked loopback; unchanged rerun outside sandbox 5/5 pass, including both adapters' redirect/body/timeout/no-cache fail-closed behavior |
| `git diff --check` and staged inventory credential-pattern scan | No whitespace errors or credential-pattern matches in the publication inventory; hand-reviewed fixture IDs/URLs/text are synthetic |

New contract tests use Node built-ins and the existing locale registry only, no
npm modules, loopback server, DB, cloud, provider, filesystem package cache or browser
required. Rerun directly with the two test paths above. No test assertion or runtime
guard was relaxed to resolve the sandbox failure.

Existing Backend checks workflow may run Identity/Content jobs for this PR; it
does **not** discover these new `.mjs` contract suites. Do not describe green old
workflow jobs as automated coverage of the 21 new tests. Their evidence is local;
PoC CI addition belongs to TU05 / Duy-reviewed workflow scope. Record actual PR/head
and observed checks in the GitHub handoff, not predicted statuses here.

## Deliberately unverified and next handoff

- No real browser, storage race, multitab coordinator, Service Worker/IndexedDB,
  beacon reliability, GPS, Safari/device, graph correctness or throughput measured.
  Same-browser/different-browser behavior is tested via supplied synthetic IDs.
- No live Identity/Content/Usage calls, Atlas read/write/provisioning, Manager login,
  provider/model/map acquisition, inference/audio generation/upload, config/deploy,
  publication or data acceptance. Existing hosted status is not retested here.
- Fixture authority tokens test adapter outcomes only. Existing separate adapter
  tests are not end-to-end Staff/Manager/locked-account live acceptance.
- No screenshot/video applies to this non-UI task. Real UI/device evidence remains
  required in the respective implementation/release tasks.
- New endpoints and their DB/CORS/rate/security tests wait for Duy's U1–U4 approval.
  Global Content job/worker health bridges, binary/profile data, source access and
  acquisition/hosting budgets remain explicit integration gates.

Hạo can adapt the semantic methods and synthetic routing fixtures locally now;
never ship them as a production fallback. Request Duy choose A (approve the proposed
groups with remaining measured-data gates) or B (list changes per U/R group), review
and merge the small PR into `codex/poc-demo`. PR uses `Refs #70`; keep #70 and original
backlog open until Duy's acceptance. Next in sequence is TU02/#71 after shared
contract decision, rather than implementing an unapproved HTTP shape.
