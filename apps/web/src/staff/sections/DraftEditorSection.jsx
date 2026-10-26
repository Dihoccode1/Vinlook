export function DraftEditorSection({
  change,
  dirty,
  document,
  editable,
  input,
  uploadIntent,
  mutate,
  revision,
  run,
  setUploadIntent,
  setThumbnailFile,
  state,
  store,
  thumbnailFile,
}) {
  return (
    <section id="draft-editor" aria-label="Draft editor">
      <p className="staff-eyebrow">03 / PLACE DETAILS</p>
      <h2>Draft</h2>
      <label>
        Name (English)
        <input
          disabled={!editable || dirty === 'locale'}
          value={input.nameEN ?? ''}
          onChange={(e) => change('nameEN', e.target.value)}
        />
      </label>
      <label>
        English source
        <textarea
          disabled={!editable || dirty === 'locale'}
          value={input.sourceTextEN ?? ''}
          onChange={(e) => change('sourceTextEN', e.target.value)}
        />
      </label>
      {['location', 'entrance'].map((field) => (
        <fieldset key={field} disabled={!editable || dirty === 'locale'}>
          <legend>{field === 'location' ? 'Marker' : 'Entrance'} · longitude, latitude</legend>
          {[0, 1].map((index) => (
            <input
              key={index}
              aria-label={`${field} ${index === 0 ? 'longitude' : 'latitude'}`}
              type="number"
              step="any"
              min={index === 0 ? -180 : -90}
              max={index === 0 ? 180 : 90}
              value={input[field]?.coordinates[index] ?? ''}
              onChange={(e) => {
                const coordinates = [...(input[field]?.coordinates ?? [0, 0])];
                coordinates[index] = Number(e.target.value);
                change(field, { type: 'Point', coordinates });
              }}
            />
          ))}
        </fieldset>
      ))}
      <button
        disabled={
          !editable || dirty === 'locale' || !input.nameEN?.trim() || !input.sourceTextEN?.trim()
        }
        onClick={() =>
          void mutate(
            (a, s, k) => {
              const changes = {
                nameEN: input.nameEN,
                sourceTextEN: input.sourceTextEN,
                location: input.location,
                entrance: input.entrance,
                thumbnailAsset: input.thumbnailAsset,
              };
              return revision
                ? a.save(revision.id, revision.editVersion, changes)
                : a.create(changes, k);
            },
            { idempotent: !revision },
          )
        }
      >
        {revision ? 'Save draft' : 'Create POI'}
      </button>
      <label>
        Thumbnail (max 2 MiB)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={!editable || dirty || !revision}
          onChange={(e) => {
            setThumbnailFile(e.target.files?.[0] ?? null);
            setUploadIntent(null);
          }}
        />
      </label>
      <button
        disabled={!editable || dirty || !revision || !thumbnailFile || Boolean(uploadIntent)}
        onClick={() =>
          void mutate(async (a, s) => {
            const current = s.document.workingRevision;
            const pending = await a.thumbnailIntent(current.id, current.editVersion);
            setUploadIntent({ ...pending, revisionId: current.id });
            const result = await a.upload(pending.intentId, thumbnailFile);
            setUploadIntent({ ...result, revisionId: current.id });
            if (result.status !== 'verified')
              throw Object.assign(Error(), { code: 'MEDIA_VERIFICATION_UNAVAILABLE' });
            return a.save(current.id, current.editVersion, { thumbnailAsset: result.asset });
          })
        }
      >
        Upload and attach thumbnail
      </button>
      {uploadIntent && uploadIntent.revisionId === revision?.id && (
        <section aria-label="Upload recovery">
          <p>
            Upload {uploadIntent.intentId ?? uploadIntent.id} · {uploadIntent.status} — uncertain
            uploads are not automatically resent.
          </p>
          <button
            disabled={state.busy}
            onClick={() =>
              void run(() =>
                store.inspect(async (a) => {
                  const result = await a.mediaStatus(uploadIntent.intentId ?? uploadIntent.id);
                  setUploadIntent({ ...result, revisionId: revision.id });
                }),
              )
            }
          >
            Check upload status
          </button>
          <button
            disabled={!editable || dirty}
            onClick={() =>
              void mutate(async (a) => {
                const result = await a.reconcile(uploadIntent.intentId ?? uploadIntent.id);
                setUploadIntent({ ...result, revisionId: revision.id });
                return { poiId: document.poi.id };
              })
            }
          >
            Reconcile existing upload
          </button>
          <button
            disabled={
              !editable || dirty || uploadIntent.status !== 'verified' || !uploadIntent.asset
            }
            onClick={() =>
              void mutate((a) =>
                a.save(revision.id, revision.editVersion, { thumbnailAsset: uploadIntent.asset }),
              )
            }
          >
            Attach verified thumbnail
          </button>
        </section>
      )}
    </section>
  );
}
