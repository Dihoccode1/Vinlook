# TASK-001 — Concrete empty-repository bootstrap review

Date: 23 October 2026. Repository read confirms empty. Issue #1 is closed as completed, but there is no initial commit or PR. Treat this as a status mismatch, not verified delivery. Do not reopen or close Issues on behalf of reviewers without an appropriate decision.

## Prepared deliverables

Root README.md, CONTRIBUTING.md and .gitignore are prepared locally. The prior approved requirement/design/traceability inventory is rehashed into bootstrap-publication-manifest.json for review. Only explicitly listed text files may be published. Provider screenshots, credentials, private result folders, downloaded graphs/models and virtual environments are excluded.

The Gemini key replacement/revocation is user-reported. No new key is required for documentation bootstrap and no secret should be copied into the baseline.

## Proposed bootstrap exception A

1. Create one README.md seed commit on the empty default main branch, containing the exact reviewed root README. No application code, secret or workflow in this commit.
2. Create codex/task-001-docs-baseline from that seed. Add the reviewed baseline/conventions as a commit and open a draft PR linked to Issue #1.
3. Tú reviews the PR under the existing review policy. Capture actual review and links before considering TASK-001 complete. No automatic merge.
4. Only then mark dependent scaffold tasks ready and create their actual Issues before code. Docker/CI/CD implementation belongs to those tasks, not this documentation Issue.

Benefit: a usable main branch exists for a normal review PR; the sole initial exception is one transparent documentation-only seed.

Alternative B: review the entire root-commit package outside GitHub first, then create the initial baseline commit. This delays PR-based review until the repository exists.

Decision pending: approve A or B before any remote initial commit. Existing approvals authorize preparation; the empty-main review exception has not previously been selected. No repository settings, permissions or paid services need to change.

## Decision — DEC-109

User selected A. README-only main seed followed by baseline draft PR is authorized. Human review and final merge remain pending; no application code is included.

