export function ProcessingJobsSection({
  canWrite,
  dirty,
  jobDispatch,
  mutate,
  revision,
  run,
  setJobDispatch,
  state,
  store,
}) {
  return (
    <section id="processing-jobs" aria-label="Jobs">
      <p className="staff-eyebrow">05 / PROCESSING</p>
      <h2>Jobs</h2>
      <p>
        Processing queues work. Gemini jobs need an explicit dispatch; MMS audio needs the local
        worker. Refresh to read the current server state.
      </p>
      <button
        disabled={!canWrite || dirty}
        onClick={() => {
          if (
            window.confirm(
              'Dispatch the next eligible Gemini job across the entire system? It may belong to another POI and consume provider quota. This does not start the local MMS worker.',
            )
          )
            void run(async () => {
              const result = await store.mutate((a) => a.runNext(crypto.randomUUID()));
              setJobDispatch(result);
            });
        }}
      >
        Dispatch next system Gemini job
      </button>
      {jobDispatch && (
        <p role="status">
          Dispatch acknowledged · Job {jobDispatch.jobId ?? 'none returned'}. Refresh jobs to verify
          completion.
        </p>
      )}
      <button disabled={state.busy} onClick={() => void run(() => store.jobs())}>
        Refresh jobs
      </button>
      {state.jobs.map((job) => (
        <article key={job.id}>
          <p>
            {job.languageCode} · {job.taskType} · {job.status ?? 'unknown'} ·{' '}
            {job.safeErrorCode ?? job.errorCode ?? job.error ?? '—'}
          </p>
          <button
            disabled={
              !canWrite ||
              dirty ||
              !['failed', 'waiting_quota'].includes(job.status) ||
              job.error === 'PROVIDER_OUTCOME_UNKNOWN'
            }
            onClick={() => {
              if (
                window.confirm(
                  'Retry this job? A provider call may occur. Unknown outcomes require separate operator review.',
                )
              )
                void mutate((a, s, k) => a.retry(job.id, revision.editVersion, k), {
                  idempotent: true,
                });
            }}
          >
            Retry job
          </button>
        </article>
      ))}
    </section>
  );
}
