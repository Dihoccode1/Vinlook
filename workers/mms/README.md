# Local MMS worker (TASK-018)

Explicitly launched Linux amd64 Docker worker for twelve frozen MMS audio profiles. Gemini translation/four Gemini audio locales stay in Content. No Atlas access, inbound port, cloud GPU, publication privilege or automatic Staff retry. One local job/model child at a time; parent renews the existing five-minute Content lease every 60 seconds. CPU synthesis cannot block that renewal thread. Docker resource limits are safeguards, not full twelve-model performance acceptance.

Build from repository root:

```
docker build -f workers/mms/Dockerfile -t vinlook-mms:local .
```

Pinned Python 3.12.14 digest, exact CPU Torch/inference package wheel URLs/SHA256 in requirements-lock.txt, and checked Debian FFmpeg package. Linux dependencies were resolved with research-constraints.txt; resolve-lock.py converts a reviewed pip report into hash-checked artifacts. No floating model/library fallback. Image build installs packages, not model weights. Inherited remote/worker secrets are not passed to the CPU/FFmpeg child. Public model dependencies may contain downloader libraries; inference uses local_files_only and offline settings.

Copy .env.example privately or supply launch environment; configure reviewed HTTPS Content origin, worker ID/dedicated key, and an explicit subset of prepared languages. Never put actual credentials in CLI arguments, committed files, image layers, logs or journal. Compose requires settings and defaults to check, not processing:

```
docker compose -f workers/mms/compose.yaml run --rm mms check
docker compose -f workers/mms/compose.yaml run --rm mms run --once
docker compose -f workers/mms/compose.yaml run --rm mms run --loop
```

Compose uses nonroot UID10001, 4 CPUs/4GiB, private named state/model volumes (models read-only), read-only image, dropped capabilities, no Docker socket or published port. Prepare model-cache volume ownership/files in a separately reviewed setup step; empty cache intentionally prevents check/run. Do not copy real keys among machines or run multiple state directories with the same caller credential. Local file lock excludes duplicate instances on the same state volume. Loop polls only every30s when idle while explicitly active. Stop with SIGINT/SIGTERM; there is no autostart daemon or Render wake-up traffic.

Registry is copied from the single Content hybrid-v1.json source at build and checked against hybrid-v1.sha256. It binds twelve exact model revisions and approved MP3 profile; worker never loads a model/revision/URL from a job. Cache layout is `<cache>/<revision>/manifest.json` plus allowlisted config/tokenizer/model.safetensors files. Manifest `{model,revision,files:{filename:sha256}}` is checked before loading. No pickle weights, remote code, implicit token or runtime network download. `prepare-models` currently prints a plan only; exact file/disk/download/inference approval and the model acquisition step remain separate. No real model files are bundled or automatically imported from the research virtualenv/cache.

Long text splits deterministically at sentence whitespace, then ordinary whitespace, preserving every substring and order. Maximum400codepoints/256tokens/chunk and64chunks. Unsupported unsplittable input fails; no summarization, fixed-rate adjustment, silence padding or trimming to pass duration. CPU child outputs finite mono PCM at the model's validated configured sample rate. FFmpeg converts to mono24kHz64kbps MP3; independent ffprobe packet-duration sum checks90–150s and<=3MiB before Content independently verifies it. Borderline encoder padding may cause rejection; revise narration through Staff workflows.

Private journal commits phase before claim/intent/upload/result, plus exact job/attempt/input hash, local MP3 digest, intent ID and result body. No credential. One live attempt and32MiB total state budget; unknown/orphan files block rather than being recursively deleted. Completed attempt removes only checked audio files and retains one small receipt. State contains private narration data and must not be web-served/backed up publicly.

- Lost claim response: retain uncertainty marker; stop without another claim until at least the previous lease window passes (315s conservative marker).
- Lost intent acknowledgement: no automatic second intent. On a later live-lease recovery, report a safe failure. Orphan remote intents are retained, not silently deleted.
- Lost upload acknowledgement: only reconcile known intent, never repeat PUT or synthesize another recording for that upload. At most3read-only attempts/run with5/15/30s backoff; uncertain state remains blocked for later recovery.
- Lost result acknowledgement: persist/replay exactly the same body, at most3attempts/run. Replay receipt before lease renewal on restart, because accepted receipts can outlive leases. Stale/conflicting attempts stop; no relabelling an old asset under a new attempt.
- Renewal failure, source/version/state change or lost attempt: cancel child/stop side effects. Local journal prevents silently claiming unrelated work until recovery/human handling. A permanently stale attempt requires a reviewed state-resolution action; no automatic discard command is provided.

Verification: build Dockerfile.test for dependency-free worker unit tests; full image tests include real FFmpeg and inference-package import smoke. `python -m unittest discover -s tests -v` runs inside the full image using `--entrypoint python`. `services/content/test/local-worker.integration.test.js` runs actual Python/FFmpeg against guarded loopback Content/Identity/Mongo and synthetic media providers; test-only driver injects synthetic PCM and HTTP fixture origin. That driver is not a production HTTP bypass or model quality test. No real model inference/locale coverage/resource or hosted acceptance inferred. Keep existing readiness/release gates, including TASK010 operator acceptance.


## TASK025 opt-in English acquisition and canary

User-approved English-only setup is a separate command; worker check/run/prepare-models behavior is unchanged. `python -m vinlook_mms.acquire_english --cache /models` prints a no-write/no-network plan; add `--apply` only for explicitly approved acquisition. The utility pins five English files/revision, validates provider SHA256 or Git blob identities, creates SHA256 manifests by atomic staging, blocks unknown/partial caches and never auto-cleans or silently retries downloads. No proxy/token inheritance; only fixed Hugging Face HTTPS paths and bounded allowlisted CDN redirects. Keep the model cache private and mounted read-only during inference. Partial staging or a stale acquisition lock requires inspection, not a recursive cleanup command.

`python -m vinlook_mms.canary_english --input /input/poi001.json --cache /models --output /out` validates a hash-bound POI001 plan without inference. `--apply` is Linux-only; launch in the approved4CPU/4GiB container with `--network none`, read-only cache/source and an empty task output directory. Input exact keys: poiId (`POI-001`), text, sourceTextSha256. No Content origin/key, job claim, provider/DB/upload or publication. The bounded synthesis observer exposes only chunk progress/PCM seconds, not text; normal worker synthesis retains its existing duration guards and no observer. Canary records observed child RSS, duration/format/hashes and a safe failure or pending human-listening result. Output directory must be empty, so a rerun is a separate explicit decision.

Evidence: docs/planning/task025-canary-verification.md. The one real English canary is not full80pair or12model acceptance. Do not acquire additional locales or activate Gemini based on that result alone.
