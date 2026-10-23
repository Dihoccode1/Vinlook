# Contributing to Vinlook

The sole target repository is `Dihoccode1/Vinlook`. Do not import the unrelated Git repository detected above this working directory.

## Before starting

Work must link to an actual Issue with approved requirements/design, dependencies, inputs, acceptance criteria and a human reviewer. An approval or a closed Issue alone does not prove implementation or test success. Changes to scope, architecture, data contracts, deployment or assignment require the project lead's decision first.

## Branches and review

Use a short task branch such as `codex/task-001-docs-baseline` and a pull request to `main`. Duy reviews work by Tú/Hạo; Tú reviews work by Duy according to the approved plan. AI assistance does not replace the human review. Do not change collaborator permissions or rulesets merely to bypass missing access.

The empty-repository seed exception must be approved before the first commit. Its proposed scope is one documentation-only README, followed by a review branch/PR for the complete baseline. No application code is included in the seed.

Before merge: satisfy Issue acceptance criteria, run relevant checks, document limitations, obtain the designated human review and capture actual commit/PR links. Squash merge follows the approved GitHub plan; do not auto-merge without review. Secrets and deployment credentials are configured privately, outside commits and PR bodies.

## Evidence

Distinguish proposed, executed, user-reported, failed, pending and waived evidence. Preserve failures and measured resource/quota limits. Android is waived; it must never be reported as a successful device test. Research harness results are not product acceptance.

## Files excluded from publication

Never commit API keys, JWT signing keys, passwords, real `.env` files, database dumps, backups, private screenshots, provider responses, downloaded map/model data, virtual environments, portable tools or local deployment credentials. Commit reviewed metadata/manifests and safe summaries only. Run a content scan on the exact publication inventory; ignore rules alone do not establish that files are safe.
