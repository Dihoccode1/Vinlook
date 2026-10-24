# TASK025 — First real English canary evidence

25October2026 UTC+7. User approved A: implement acquisition utility, acquire only the pinned English files and run one POI001 local canary. **Duy implements; Tú reviews.** [Issue52](https://github.com/Dihoccode1/Vinlook/issues/52). This is a canary substep, not completion of the80pair batch.

## Outcome

One real POI001 English narration generated successfully in Linux Docker, with network disabled during inference. Source230words, SHA256 `6cbf0b3ddeebdb6b213fa6f4d1d95b43020f7b6daf0d801efb3961fbaa02fe45`. Pinned `facebook/mms-tts-eng@c71de0fe7204c83f1c10820a7d696d0b450048ba`. Existing synthesis/chunking/conversion path, no padding, silence insertion, trimming or speed adjustment.

| Observation | Measured result |
| --- | --- |
| PCM | 93.696seconds, mono16kHz;14chunks, complete text |
| Final MP3 | 93.744seconds, mono24kHz,64kbit/s conversion profile |
| MP3 bytes | 749996 |
| MP3 SHA256 | `cefdc0d02f46a2bddd9530a678dd7681a318efa571161a1324ca8f20e322b2f1` |
| Synthesis elapsed | 49.799seconds, including child imports/loading |
| Total elapsed | 50.661seconds |
| Observed peak child RSS | 891617280bytes; sampled, not whole-container/machine peak |
| Limits | 4CPU/4GiB container; synthesis deadline480seconds |
| Provider/job/publication | 0provider calls,0job claims, not published |
| Human listening/pronunciation | pending Tú review |

Machine format/duration checks passed90–150seconds and<=3MiB. This does not establish listening quality, perfect transcript recitation, pronunciation, end-to-end protocol/media delivery or other locales. Audio is a private ignored canary artifact, not committed to GitHub. Source remains provisional for final batch: exterior-arrival/closure handoff and final source revisions must be reviewed before generation of final assets. The80plan rows remain not_started; completed final batch pairs=0.

## Acquisition and integrity

Created task-owned Docker volume `vinlook-task025-english-models`, labels `vinlook.task=025` and `vinlook.purpose=english-canary`. No existing research cache was imported/mutated. Actual download145229900bytes (5files); all provider integrity checks passed before atomic staging promotion. A separate network-disabled read-only verification of all5files passed after acquisition. No token/proxy/API key inheritance; HTTPS only, fixed revision/file allowlist and bounded allowed CDN redirects. No retry or additional model was downloaded.

| File | Verified SHA256 |
| --- | --- |
| config.json | `c2a93c1dfbf33b640163f2ade16345b9a5194fa54de9a04a04272b76a97fe171` |
| model.safetensors | `69cf8b651c1493f1801dfd2311c298d694a38357bc9a1e41f410491ea6f0e1be` |
| special_tokens_map.json | `87c02ba90dba0e0765358bd3aa2265714b2405429b069a89af51e292db9b8c3d` |
| tokenizer_config.json | `77c74b93b1d36f29248926dbd7714bda59990159cd14cd7ba45fd0115bff905b` |
| vocab.json | `304f7e71c40d601f9b89d81904609512eebe96b2a941f0a251fc0c9f397bcc45` |

File sizes/provider LFS SHA256 and Git blob IDs are pinned in `vinlook_mms/acquire_english.py` and the approved preflight proposal. Model license metadata CC-BY-NC4.0; existing educational/noncommercial use retained. Keep source/license attribution if distributing model-derived artifacts; no model binary redistributed here.

## Implementation and tests

- Separate opt-in `acquire_english` command: plan default, explicit apply, path/link checks, exclusive lock, verified cache reuse, exact file inventory, bounded downloads, provider hashes, atomic directory promotion, private manifest. Unknown/partial files retained for inspection; no recursive deletion/resume or automatic retry.
- Separate `canary_english` command: exact hash-bound POI001 input, no model load in plan mode, empty output directory, fixed English registry, read-only verified cache, bounded synthesis/FFmpeg/probe, safe measured result. No service credentials or job API. Synth-child observer is optional and only emits safe chunk/duration metrics; normal worker invocation and all duration guards unchanged.
- **32unique test groups passed** in Linux, network none, read-only image/source with disposable tmpfs:12acquisition,3canary-input,17existing worker/transport/real-FFmpeg groups. Relevant cases include size/hash corruption, cache tampering, unexpected files, parallel lock, low disk, untrusted redirects, path/symlink rejection, hash-bound source changes, real FFmpeg validation and existing recovery behavior.
- Initial Windows sandbox tests failed on temporary-directory permissions; not counted as pass. Initial Linux run with64MiBtmpfs correctly hit the512MiBfree-space guard; test fixture changed to1GiBtmpfs without changing production guard. Final32groups passed. No model weights/provider involved in unit tests.

## Actual execution environment and cleanup

Docker daemon initially unavailable; started Docker Desktop explicitly for approved canary. Reused existing `vinlook-task018-worker:verified` image shortID `79528e395b16` with current worker Python source mounted read-only; this is not a claim of a newly built release image. Model acquisition had outbound access only in its explicit setup command; canary and verification ran with `--network none`. Inference cache read-only, root filesystem read-only, nonroot worker, capabilities dropped, no-new-privileges. Only task input/output mounts, no host home, Docker socket or keys.

All TASK025containers used `--rm`; final label-filtered inventory found none remaining. Cache volume retained for review/future explicitly authorized English work; no broad prune or unrelated container cleanup. Docker Desktop remains running. Private WAV/MP3 and result/input live under ignored `.bootstrap-review/task025-canary-*`; no binary/secret goes into the PR. Host MP3 hash independently matched reported hash. Resource observation does not establish12model/50user capacity.

Example module commands inside the described container (paths are container paths):

```text
python -m vinlook_mms.acquire_english --cache /models
python -m vinlook_mms.acquire_english --cache /models --apply
python -m unittest discover -s tests -v
python -m vinlook_mms.canary_english --input /input/poi001.json --cache /models --output /out --apply
```

Do not rerun apply against the retained nonempty output or expand model/cloud scope automatically. Default worker `check`, `run` and plan-only `prepare-models` unchanged. No Atlas/Cloudinary/Gemini, provider counters, catalog, live Content target, source publication or hosted deployment used. Actual free-project/quota setup, other11model manifests/acquisition, final source freeze,80pair processing, human multilingual/audio review and application end-to-end acceptance remain separate pending work.

## Additional build attempt

Prepared a20file/85kB allowlisted temporary Docker context (no environment files, keys, models or audio) and tried the unchanged production Dockerfile with --network none. BuildKit lacked the apt layer cache, so apt could not resolve Debian and the build stopped before installing packages. This attempt is not counted as a successful fresh release build; no dependency/version pin was changed. BuildKit separately resolved Docker base metadata even with RUN networking disabled. The successful32tests and real canary used the already verified runtime image with current source read-only bind mounts as stated above. Production Dockerfile recursive package COPY includes new modules; fresh production-image build/CI remains a separate check, not claimed passed here.
