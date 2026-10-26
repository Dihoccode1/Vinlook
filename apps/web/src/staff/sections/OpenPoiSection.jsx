import { emptyDraftInput as initial } from '../draft-input.js';
export function OpenPoiSection({
  canWrite,
  dirty,
  load,
  poiId,
  setDirty,
  setIdempotencyKey,
  setPoiId,
  state,
  store,
}) {
  return (
    <section id="open-poi" aria-label="Open POI">
      <div>
        <p className="staff-eyebrow">02 / CHOOSE A PLACE</p>
        <h2>Open a place</h2>
        <p>Paste an existing POI ID to load its current revision, or start a new draft below.</p>
      </div>
      <label>
        POI ID
        <input
          value={poiId}
          onChange={(e) => setPoiId(e.target.value)}
          placeholder="24-character POI ID"
          spellCheck={false}
        />
      </label>
      <button disabled={state.busy || !/^[a-f0-9]{24}$/.test(poiId)} onClick={load}>
        Load POI
      </button>
      <button
        disabled={!canWrite}
        onClick={() => {
          if (!dirty || window.confirm('Discard unsaved input?')) {
            store.newDraft({ ...initial });
            setDirty('metadata');
            setIdempotencyKey(null);
          }
        }}
      >
        New draft input
      </button>
    </section>
  );
}
