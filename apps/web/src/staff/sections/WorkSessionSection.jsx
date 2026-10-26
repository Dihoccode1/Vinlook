export function WorkSessionSection({ canWrite, reason, run, setReason, state, store }) {
  return (
    <section id="work-session" aria-label="Work session">
      <div>
        <p className="staff-eyebrow">01 / START YOUR DAY</p>
        <h2>Work session</h2>
        <p>
          Open today’s session to edit content. Closing it keeps your work and records the reason.
        </p>
      </div>
      <button disabled={state.busy} onClick={() => void run(() => store.session('open'))}>
        Open / reopen session
      </button>
      <label>
        Close / return / review reason
        <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </label>
      <button
        disabled={!canWrite || !reason.trim()}
        onClick={() => void run(() => store.session('close', reason))}
      >
        Close session
      </button>
    </section>
  );
}
