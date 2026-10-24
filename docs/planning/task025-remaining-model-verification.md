# TASK025 remaining-model acquisition evidence

25 October 2026 UTC+7. User approved implementation, tests and acquisition of the eleven pinned remaining models. Duy implements; Tu reviews.

## Actual result

Exactly 11 models / 55 source files / 1,597,661,068 bytes downloaded sequentially into dedicated Docker volume `vinlook-task025-remaining-models`. Every revision, file size and provider integrity identity matched the approved metadata. Installed SHA256 manifests written atomically per model. No automatic retry, partial deletion or fallback. Initial target was empty; available volume space 1,010,701,123,584 bytes, above the 3 GiB guard. Host sparse backing storage is separate; observed host C free space before download was about 129 GB.

Separate network-disabled, read-only verification passed all eleven cache folders using both acquisition verification and the existing worker `synth_child.cache_manifest` validator. Root inventory contained exactly the eleven expected revision directories, no staging/lock leftovers. SHA256 evidence is in `task025-remaining-model-evidence.json`. The English cache volume was not mounted or changed. Model files remain private in the Docker volume, not in this repository.

## Implementation and validation

New separate command `python -m vinlook_mms.acquire_remaining --cache /models --languages hi,es,ar,fr,bn,id,ur,ru,de,pcm,vi`; default plan has no cache/network side effects. Explicit `--apply` enables acquisition. Runtime manifest hash is pinned in code; only these eleven locales/revisions/files allowed. Uses existing audited English path/hash/HTTPS helpers; English command and normal worker commands unchanged. Per-model acquisition retains size bounds, lock, staging, fsync, manifest verification and atomic promotion. Outer lock serializes selected-locale acquisition. Unknown root entries and partial staging block for review. Failures stop the sequence and retain previous completed models/partial evidence.

40 Linux unit tests passed: 8 new remaining-model tests plus 32 existing acquisition/canary-input/worker/transport/real-FFmpeg tests. Tests used fake model bytes, network disabled and disposable 1 GiB tmpfs. Covers exact manifest/total, default plan, locale allowlist, 3 GiB boundary, sequential promotion/reuse/tamper, unknown inventory, lock conflict and manifest tamper. Existing corruption/oversize/path/redirect/recovery checks passed. AST, JSON equivalence and whitespace checks passed.

Acquisition/verification reused verified runtime image `79528e395b16d896e149585c93a1f936ab720773eebdaa8e64f263c3e0ea442a` with current source read-only mounted, 4 CPU / 4 GiB, dropped capabilities, no-new-privileges. No fresh production-image build/CI success is asserted; previous build limitation remains separate. All containers used --rm; model volume retained for later approved work. No dependency/pin change, model loading or inference.

## Remaining prerequisites

User explicitly reports no actual Content/Identity HTTPS origins and no Gemini project quota evidence. These remain pending setup, not a successful live environment. No Gemini/Atlas/Cloudinary call, database write, audio generation, job claim, media upload or publication in this step. Human listening remains pending; old English canary used old source. TASK025 remains open, 0/80 final pairs. Eleven downloaded models have integrity acceptance only, not language/audio-quality acceptance.

Tú: review pinned metadata-to-registry mapping, digest lock, unchanged English/runtime commands, failure/reuse/lock behavior and measured evidence. Do not mark the full batch complete on this PR merge.
