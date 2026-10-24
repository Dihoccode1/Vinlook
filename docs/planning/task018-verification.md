# TASK-018 isolated verification — 24 October 2026 UTC+7

Approved contract: task018-local-worker-contract.md, user explicitly approved A for isolated implementation/testing. Owner Tú / reviewer Duy retained. No actual MMS model weights, production Content/Atlas/Cloudinary/Gemini calls, credentials, deployment or full-locale acceptance.

81 unique relevant passed test groups in final runs:

| Suite | Passed |
|---|---:|
| Linux Python worker state/lease/config/transport + actual FFmpeg | 17 |
| Actual Python worker-to-Content fixture + shared job regressions | 17 |
| Runtime/authorization/job/media units | 32 |
| Media Mongo/HTTP regressions | 15 |

Full workspace build exit0; Compose config validation used synthetic placeholders and did not start a real worker. Hash-checked image installation and pip check succeeded for36exact Linux wheels; compatible research transitives retained, including Hugging Face Hub2.2.0. Actual CPU Torch2.14.1+cpu, Transformers5.20.2, NumPy2.5.4 imports verified. VitsModel/AutoTokenizer/uroman lazy imports also verified with network disabled and no weights loaded. Import checks are separate from the81test count.

Linux worker tests ran nonroot, read-only image, temporary private state and no external network; ResourceWarning treated as error in final run. Synthetic16kHz90s PCM passed pinned FFmpeg conversion and independent ffprobe packet/stream checks, producing720428byte mono24kHz MP3. Actual worker-to-Content integration used the4CPU/4GiB container limits, real Python/FFmpeg, synthetic PCM model seam and guarded loopback Content/Identity/Mongo/media fixtures. This proves the protocol path, not real MMS pronunciation, narration duration or machine-wide resource capacity.

Recovery cases cover: one-state-directory lock; registry/locale/version and hostile paths; exact bounded HTTP response/redirect denial; renewal during held synthesis; lease loss stops work; claim acknowledgement uncertainty blocks another claim; intent uncertainty does not create a second intent; upload uncertainty only reconciles; result uncertainty replays the identical receipt before renewal; digest/state tampering and output/child limits. End-to-end lost upload/result case completed with one upload request and two identical result requests. No automatic Staff retry or publication.

Early failed attempts are not counted: public CPU wheel download timeout recovered without version change; resolver UTF-8 handling corrected; test driver switched to module entrypoint; HTTP Content-Length EOF handling corrected and covered by fixture; subprocess stdin close fixed; old synthetic Cloudinary metadata assumed a fixed fake MP3 frame layout and was corrected to measure actual duration/channels. Production backend media validation was not relaxed. Earlier passing repeated/partial suites overlap final81.

Five dedicated fresh Mongo containers were used across failed/corrected/final/regression runs, with exact approved image, task label, loopback port and empty test databases. All five exact IDs and their own anonymous volumes were removed after image/label/volume-only mount checks. Ephemeral Python/test containers used --rm. Cached dependency/converter images remain for review; no Docker prune or unrelated deletion.

Model cache preparation/acquisition is deliberately pending. prepare-models prints a plan only; check/run fail closed for empty/unverified caches. The actual twelve pinned models, tokenizer normalization, full90–150s locale quality and CPU/RAM benchmarks require separately reviewed weight acquisition and inference steps. No human review, GitHub CI execution, Render acceptance, offline/load acceptance or TASK010 operator acceptance inferred. Product readiness remains503.
