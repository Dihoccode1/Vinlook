/** Called only after authenticated local-worker admission in existing transactions. */
export function observeWorker(job, caller, time) {
  if (caller.execution === 'local_worker' && job.inputSnapshot.execution === 'local_worker')
    job.workerObservedAt = new Date(time);
}
