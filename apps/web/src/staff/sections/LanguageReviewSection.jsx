import { localeCodes } from '../../i18n/locales.js';

export function LanguageReviewSection({
  canWrite,
  languageCode,
  dirty,
  editable,
  mutate,
  reason,
  revision,
  localizedContent,
  setLanguageCode,
  setDirty,
  setIdempotencyKey,
  setLocaleText,
  state,
  localeText,
}) {
  return (
    <section id="language-review" aria-label="Language review">
      <p className="staff-eyebrow">04 / NARRATION & REVIEW</p>
      <h2>Languages</h2>
      <p>
        Read the text and listen to the complete current audio before approving each language.
        English source is edited in Draft.
      </p>
      <label>
        Exact locale
        <select
          disabled={Boolean(dirty) || state.busy}
          value={languageCode}
          onChange={(e) => {
            setLanguageCode(e.target.value);
            setIdempotencyKey(null);
          }}
        >
          {localeCodes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <p>
        {languageCode} · textVersion {localizedContent?.textVersion ?? 'missing'} · source{' '}
        {String(localizedContent?.isSourceCurrent ?? false)} · audio{' '}
        {String(localizedContent?.isAudioCurrent ?? false)} ·{' '}
        {localizedContent?.reviewStatus ?? 'missing'}
      </p>
      <textarea
        aria-label="Locale text"
        value={localeText}
        disabled={!editable || languageCode === 'en' || dirty === 'metadata'}
        onChange={(e) => {
          setLocaleText(e.target.value);
          setDirty('locale');
          setIdempotencyKey(null);
        }}
      />
      {localizedContent?.audioAsset?.url && (
        <div className="staff-audio">
          <p>
            Current audio · {languageCode} · textVersion {localizedContent.textVersion} ·{' '}
            {localizedContent.durationSeconds ?? 'Unknown'} seconds
          </p>
          <audio
            aria-label={`Current ${languageCode} narration`}
            key={`${languageCode}:${localizedContent.audioAsset.url}`}
            controls
            preload="none"
            src={localizedContent.audioAsset.url}
          />
        </div>
      )}
      <button
        disabled={!editable || languageCode === 'en' || dirty === 'metadata' || !localeText.trim()}
        onClick={() =>
          void mutate((a) =>
            a.saveLocale(revision.id, languageCode, revision.editVersion, localeText),
          )
        }
      >
        Save locale text
      </button>
      <button
        disabled={
          !canWrite ||
          dirty ||
          !localizedContent ||
          !localizedContent.isSourceCurrent ||
          !localizedContent.isAudioCurrent ||
          !localizedContent.audioAsset?.url
        }
        onClick={() => {
          if (
            window.confirm(
              `Confirm you reviewed the text and listened to the complete ${languageCode} audio (${localizedContent.durationSeconds ?? 'unknown'} seconds), textVersion ${localizedContent.textVersion}, editVersion ${revision.editVersion}?`,
            )
          )
            void mutate((a) =>
              a.review(revision.id, languageCode, {
                expectedEditVersion: revision.editVersion,
                expectedTextVersion: localizedContent.textVersion,
                decision: 'approved',
              }),
            );
        }}
      >
        Approve exact locale
      </button>
      <button
        disabled={!canWrite || dirty || !localizedContent || !reason.trim()}
        onClick={() =>
          void mutate((a) =>
            a.review(revision.id, languageCode, {
              expectedEditVersion: revision.editVersion,
              expectedTextVersion: localizedContent.textVersion,
              decision: 'changes_required',
              reason,
            }),
          )
        }
      >
        Request changes
      </button>
      <button
        disabled={!editable || dirty}
        onClick={() => {
          if (
            window.confirm(
              `Queue processing for ${languageCode}? This may consume free provider quota.`,
            )
          )
            void mutate(
              (a, s, k) => a.process(revision.id, revision.editVersion, [languageCode], k),
              {
                idempotent: true,
              },
            );
        }}
      >
        Process selected locale
      </button>
    </section>
  );
}
