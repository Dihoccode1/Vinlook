# TASK-025 — Batch preflight and first real canary proposal

25October2026 UTC+7. User approved proceeding to TASK025 preflight. **A approved: English-only acquisition utility and one local canary; Duy implements, Tu reviews.** Baseline proposed ownerHao/reviewerDuy; proposed replacement Duy/Tu is not assumed from previous task transfers. No provider request, model download, real credential inspection, database mutation or deployment has occurred.

## Inventory prepared without calls

[Batch plan](task025-batch-plan.json):5POIs ×16locales =80text/audio pairs, all not_started. Fixed registry vinlook-hybrid-v1:75non-English translation jobs using gemini-3.5-flash-lite,20Gemini audio outputs (4locales ×5),60local MMS audio outputs (12locales ×5). These are job counts, not guaranteed HTTP call counts, quota fit or successful outputs. Retries can add calls; no automatic retry of uncertain dispatch.

Narration hashes/counts derived from merged remote docs/content/poi-001-005-scripts-en.md:230/233/244/239/234words. IDs are editorial, not database ObjectIds. DB IDs/textVersions remain null until actual draft admission. Plan is provisional: exterior-arrival/closure copy handoff from TASK024 must be resolved/reviewed before freezing the final batch source versions. A changed source requires a new hash/version and regeneration where appropriate; no old audio relabelled as new.

## What the merged code does and does not establish

- TASK017/018/019 implementations are merged; adapter tests, worker fixture tests and converter checks do not prove live provider/model acceptance.
- Worker prepare-models currently emits plan_only. No actual downloader or verified production model cache is implemented/provisioned by that command. English/full12model inference in worker packaging remains untested.
- Actual Content HTTPS origin, provisioned owned DB collections/indexes, service credentials, private Gemini config/free-project caps and Cloudinary binding have not been verified for this batch. No secret file contents are read to infer readiness. Atlas writes/uploads/live jobs remain gated separately.
- Google's [rate-limit guide](https://ai.google.dev/gemini-api/docs/rate-limits), read25October2026, directs checking actual active project limits. Limits are per project, not interchangeable API keys. Do not guess RPM/RPD/TPM or treat the old short samples as current free-tier proof. [TTS guide](https://ai.google.dev/gemini-api/docs/speech-generation) currently documents the pinned3.8TTS model; account availability/quota is not proven by documentation.

## Proposed stage A — one English canary locally (recommended)

Implement a small explicitly invoked research/setup utility, not a runtime worker downloader, that acquires only these5files from the existing English checkpoint. Model selection/revision/library pins unchanged. No pickle, remote code, token or research-cache reuse. Use a task-owned private cache; atomic staging and verified manifest matching existing cache_manifest. Reject unexpected paths/files and verify LFS SHA256 or pinned Git blob identity before promoting files; calculate SHA256 for every installed file. Reuse verified files rather than silently repeat downloads. Do not change prepare-models from plan-only without a reviewed code change.

Model: `facebook/mms-tts-eng`; exact revision `c71de0fe7204c83f1c10820a7d696d0b450048ba`. Read-only Hugging Face revision metadata fetched25October2026; no weights fetched.

| File | Bytes | Provider integrity metadata |
| --- | ---: | --- |
| config.json | 1641 | Git blob 5f06bace91bc2be88912491d4575ddef044cb273 |
| model.safetensors | 145227512 | SHA256 69cf8b651c1493f1801dfd2311c298d694a38357bc9a1e41f410491ea6f0e1be |
| special_tokens_map.json | 47 | Git blob 106a9a4c07ec6f37211ce6032423f67e6ed7af16 |
| tokenizer_config.json | 287 | Git blob b6ca2175b8c7e731f3840b9e23018aa393cdb9c6 |
| vocab.json | 413 | Git blob 30097ea3f9c56d26292cab7ef5fc56feaa370131 |

Exact listed transfer total: **145229900bytes (138.50MiB)** before transport overhead. Proposed disk allowance512MiB for staged+verified files and one bounded canary output; Docker image/layers/free-space availability are separate and must be checked before running. One download at a time, no background downloads or whole12model acquisition. License metadata cc-by-nc-4.0; retain existing educational/noncommercial use and attribution. [Pinned metadata](https://huggingface.co/api/models/facebook/mms-tts-eng/revision/c71de0fe7204c83f1c10820a7d696d0b450048ba?blobs=true).

After explicit approval and isolated utility tests, acquire English files, validate cache using existing worker rules, then run POI001 narration once in existing Linux CPU worker image with4CPU/4GiB, bounded synthesis/FFmpeg, read-only cache, task-owned outputs and **no inference network**. Reuse existing synth_child and converter/probe paths; no Content/Atlas/Cloudinary/Gemini call. Capture source/profile/model/audio hashes, actual duration/format, elapsed time and observed resource evidence. No speed-up, silence padding, trimming or fake pass. Failure/out-of-range is a recorded result requiring source adjustment; do not automatically call another provider.

This is a local packaging/narration canary, not the80pair end-to-end batch or a final published asset. English source may still need revision before final batch freeze. No automatic progression to the other11models or cloud jobs. Canonical80rows remain not_started until real batch execution evidence is attached.

## Alternative B — complete live service prerequisites before canary

Set up/verify real HTTPS Content, catalog/service identities and private provider/free-quota configuration before running any canary. Better resembles the whole job pipeline; depends on unverified hosting/accounts and more setup. No cost-bearing service or new infrastructure choice is implied. Keep current pins; do not invent a new tunnel/provider to bypass origin requirements.

## After canary / before80pair batch

Review actual result; resolve final source revisions/exterior-arrival notes; review exact remaining11model manifests/disk totals before acquisition; verify Gemini project free tier/caps and key privately; verify target environment/catalog/Cloudinary and no unintended public publish. Admit a small explicit job set through existing workflow and inspect receipts/uncertain recovery before expanding. Measure every final MP3 at90–150s, verify locale/textVersion/profile/hash, and retain human review of language/pronunciation. No approve-all locale quality from model support alone.

## Decisions requested now

1. Approve A for English-only acquisition utility and one local canary, or choose B.
2. Confirm TASK025 owner/reviewer: proposed Duy/Tu, or specify another pair. Actual assignee remains empty until confirmed.

Do not send API keys in chat. Actual Gemini project/free-limit evidence can be checked later without exposing a key; it is not needed for the local English canary. Rule1 Master Prompt requires these new acquisition/execution/assignment choices to be settled before implementation; previously merged worker/adapter contracts are not reopened.

## Approval and execution recorded25October2026

User explicitly approved A and Duy/Tu. The proposed512MiB cache/output allowance is separate from Docker image storage. English5files acquired/verified, then one POI001 canary executed offline in Docker. See task025-canary-verification.md and task025-canary-evidence.json. Other models/cloud/full80batch not authorized by this canary decision; no expansion performed. Earlier pending-choice wording above is proposal history.
