# TU03 content wave plan — counts per wave, quota fields to fill

Refs #73. Builds on [batch-plan.md](batch-plan.md) (guards, stop conditions, approval record) and
[readiness.md](readiness.md) (gap register). **Proposed; nothing here authorizes a provider call,
upload, review approval or publish.** Numbers are work counts from the registry, not measured quota.

## Fresh facts used

- Duy's live GET readback, 26 Oct 23:25 (+7): POI001 Independence Palace is a working draft;
  `en`, `vi`, `zh-Hant` current; **missing thumbnail and 13 locales**:
  hi, es, ar, fr, bn, pt-PT, id, ur, ru, de, ja, pcm, ar-EG. POI002–015 were not read.
- Registry `vinlook-hybrid-v1`: translation `gemini-3.5-flash-lite`; audio via Gemini TTS
  (`server_adapter`) for zh-Hant, ja, ar-EG, pt-PT; local MMS (`local_worker`) for the other 12.

## Waves

| Wave | Scope | Pairs | Translation tasks | Gemini TTS tasks | Local MMS tasks | Gate before starting |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 0 pilot | POI001 × `es` (MMS) | 1 | 1 | 0 | 1 | Batch-plan Stage 3 approval; local-worker single-job bridge |
| 1 | POI001 remaining 12 locales | 12 | 12 | 3 (ja, pt-PT, ar-EG) | 9 | Pilot reviewed OK; POI001 thumbnail |
| 2 | POI002–005 × 16 | 64 | 60 | 16 | 48 | Live readback of POI002–005 (Stage 1); thumbnails |
| 3 | POI006–015 × 16 | 160 | 150 | 40 | 120 | Human source review of POI006–015 documents |
| **Total** | 237 open pairs | 237 | 223 | 59 | 178 | |

Counts assume every listed pair is still missing; subtract anything a fresh readback shows as
current. One task can mean several provider requests (validation failure, automatic audio enqueue
after translation), so these are **lower bounds on calls**, never budgets.

Wave 1 completes the acceptance item "one POI plays all 16 locales on the deployed app". Waves 2–3
are needed for 15 public POIs (240/240); a POI cannot be published with any locale missing.

## Quota fields Duy fills privately before each wave

| Field | Wave 0 | Wave 1 | Wave 2 | Wave 3 |
| --- | --- | --- | --- | --- |
| Gemini text model free-tier requests/day (verified date) | | | | |
| Gemini TTS free-tier requests/day (verified date) | — | | | |
| Max provider attempts this wave (incl. failures) | 2 | | | |
| Max days the wave may span | 1 | | | |
| MMS worker machine and model cache verified | | | | |
| Concurrency | 1 | 1 | | |

If a day's free quota is lower than a wave's TTS/translation count, the wave spans several days;
`QUOTA_EXHAUSTED` / `waiting_quota` stops the wave, never triggers a paid fallback.

## Human work per wave

| Wave | Listening only (90–150 s per clip) | Text reviewers needed |
| --- | --- | --- |
| 0 | 1.5–2.5 min | es |
| 1 | 18–30 min | 12 locales |
| 2 | 1.6–2.7 h | 16 locales |
| 3 | 4.0–6.7 h | 16 locales |

Every locale needs a named reviewer who reads the language (text + full listen). Unassigned
locales block their pairs; AI checks do not count as review.

## Non-AI gaps to close in parallel

1. **Thumbnails (15, all unverified).** Recommended: photos taken by the team (rights clear, record
   author/date/licence), or Wikimedia Commons files with CC BY / CC BY-SA and attribution recorded.
   Map/OSM attribution does not license photos. POI001 first (blocks Wave 1 publish).
2. **Source review POI006–015.** Documents are `draft_pending_human_review_in_document`; a human
   reviewer signs off each before Wave 3 translation (source text change would invalidate output).
3. **Arrival points (15).** Record a disposition for each desktop proposal; they must also lie on the
   walking graph (see [hcmc-build-plan.md](../routing/hcmc-build-plan.md) D5).

## Next concrete step

Stage 1 read-only inventory for POI002–015 (≤ 45 GETs, batch-plan Stage 1) by an operator logged in
as Manager, then Wave 0 approval. Neither is performed by this document.
