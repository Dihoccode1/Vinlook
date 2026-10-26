import { randomUUID } from 'node:crypto';
import { DraftFailure } from '../drafts/validation.js';
import { createJobService } from '../jobs/service.js';
import { languageCodes } from '../models/index.js';
import { dispatchHash, providerRequest, ProviderFailure } from './provider.js';
const caller = Object.freeze({ id: 'content-gemini-v1', execution: 'server_adapter' });
const plain = (v) => (v?.toObject ? v.toObject() : v);
const bad = (code = 'ADAPTER_UNAVAILABLE', status = 503) => {
  throw new DraftFailure(code, status);
};
export function createAdapterRunner(runtime, config, { provider, transcode }) {
  const { connection, models, now = Date.now } = runtime,
    Call = models.ProviderCall,
    Control = models.ProviderControl,
    jobs = createJobService(runtime);
  let active = null,
    closing = false;
  async function tx(fn) {
    const session = await connection.startSession();
    try {
      let value;
      await session.withTransaction(
        async () => {
          value = await fn(session);
        },
        {
          timeoutMS: 10000,
          maxCommitTimeMS: 3000,
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
        },
      );
      return value;
    } finally {
      await session.endSession();
    }
  }
  const currentFree = () => {
    if (now() < config.confirmedAt || now() - config.confirmedAt > 604800000)
      bad('ADAPTER_FREE_TIER_REVIEW_REQUIRED');
  };
  async function control(key, kind, session) {
    let row = await Control.findOne({ key }).session(session);
    if (!row) [row] = await Control.create([{ key, kind }], { session });
    return row;
  }
  async function heartbeat(token, job) {
    await tx(async (session) => {
      const row = await Control.findOne({
        key: 'execution',
        leaseToken: token,
        leaseExpiresAt: { $gt: new Date(now()) },
      }).session(session);
      if (!row) bad();
      row.leaseExpiresAt = new Date(now() + 300000);
      await row.save({ session });
    });
    await jobs.renew(job.id, job.attemptId, caller);
  }
  async function reserve(job, token) {
    return tx(async (session) => {
      const lock = await Control.findOne({
        key: 'execution',
        leaseToken: token,
        leaseExpiresAt: { $gt: new Date(now()) },
      }).session(session);
      if (!lock) bad();
      let call = await Call.findOne({ jobId: job.id, retryCount: job.retryCount }).session(session);
      const request = providerRequest(job),
        hash = dispatchHash(job, request);
      if (call && call.requestHash !== hash) bad();
      if (call && call.state !== 'reserved') return { call: plain(call), blocked: true };
      if (!call)
        [call] = await Call.create(
          [
            {
              jobId: job.id,
              retryCount: job.retryCount,
              attemptId: job.attemptId,
              registryVersion: job.inputSnapshot.registryVersion,
              taskType: job.taskType,
              modelId: job.inputSnapshot.modelId,
              requestHash: hash,
              state: 'reserved',
              reservedAt: new Date(now()),
            },
          ],
          { session },
        );
      call.attemptId = job.attemptId;
      const type = job.taskType === 'audio' ? 'tts' : 'translation',
        caps = config.caps[type],
        q = await control('quota:' + type, 'quota', session),
        day = new Date(now()).toISOString().slice(0, 10),
        minute = Math.floor(now() / 60000);
      if (q.day !== day) {
        q.day = day;
        q.count = 0;
      }
      if (q.minute !== minute) {
        q.minute = minute;
        q.minuteCount = 0;
      }
      if (
        q.count >= caps.rpd ||
        q.minuteCount >= caps.rpm ||
        +q.nextAllowedAt > now() ||
        +q.cooldownUntil > now()
      )
        return { quota: true };
      q.count++;
      q.minuteCount++;
      q.nextAllowedAt = new Date(now() + Math.ceil(60000 / caps.rpm));
      await q.save({ session });
      // Touch the global fence in this transaction: an expired owner cannot commit a late dispatch.
      lock.nextAllowedAt = new Date(now());
      await lock.save({ session });
      call.state = 'dispatched';
      call.dispatchedAt = new Date(now());
      await call.save({ session });
      return { call: plain(call) };
    });
  }
  async function complete(job, outcome, context) {
    return jobs.result(
      job.id,
      { attemptId: job.attemptId, inputVersion: job.inputVersion, outcome },
      caller,
      context,
    );
  }
  async function execute(job, token, controller) {
    const deadline = Date.now() + 300000,
      signal = controller.signal,
      context = { signal, deadline };
    let heartbeatBusy = false,
      dispatchKnown = false;
    const timer = setInterval(async () => {
      if (heartbeatBusy) return;
      heartbeatBusy = true;
      try {
        await heartbeat(token, job);
      } catch {
        controller.abort();
      } finally {
        heartbeatBusy = false;
      }
    }, 60000);
    const total = setTimeout(() => controller.abort(), 300000);
    try {
      currentFree();
      await jobs.admit(job.id, job.attemptId, caller);
      const reserved = await reserve(job, token);
      dispatchKnown = Boolean(reserved.call?.dispatchedAt);
      if (reserved.quota)
        return await complete(
          job,
          { status: 'waiting_quota', errorCode: 'QUOTA_EXHAUSTED' },
          context,
        );
      if (reserved.blocked) {
        const intent = reserved.call.mediaIntentId;
        // Only the original live attempt may reconcile/attach its upload. A reclaimed attempt never synthesizes again.
        if (intent && reserved.call.attemptId === job.attemptId && runtime.media) {
          const admitted = await jobs.admit(job.id, job.attemptId, caller),
            principal = original(admitted.job);
          await runtime.media.reconcile(String(intent), principal, {
            signal,
            admit: () => jobs.admit(job.id, job.attemptId, caller),
          });
          return await complete(
            job,
            { status: 'succeeded', mediaIntentId: String(intent) },
            context,
          );
        }
        return await complete(
          job,
          { status: 'failed', errorCode: 'PROVIDER_OUTCOME_UNKNOWN' },
          context,
        );
      }
      await jobs.admit(job.id, job.attemptId, caller);
      signal.throwIfAborted();
      const output = await provider.call(job, { signal });
      if (job.taskType === 'translation')
        return await complete(job, { status: 'succeeded', text: output.text }, context);
      const bytes = await transcode(output.wav, { signal });
      const admitted = await jobs.admit(job.id, job.attemptId, caller),
        principal = original(admitted.job),
        state = admitted.state;
      if (!runtime.media) throw new ProviderFailure();
      const intent = await runtime.media.issueAudio(
        {
          jobId: job.id,
          attemptId: job.attemptId,
          revisionId: String(admitted.job.revisionId),
          expectedEditVersion: state.rev.editVersion,
          sourceVersion: job.inputVersion.sourceVersion,
          textVersion: job.inputVersion.textVersion,
          languageCode: job.languageCode,
          registryVersion: job.inputSnapshot.registryVersion,
          voiceOrModelId: job.inputSnapshot.modelId,
        },
        principal,
      );
      const stored = await Call.updateOne(
        {
          jobId: job.id,
          retryCount: job.retryCount,
          attemptId: job.attemptId,
          state: 'dispatched',
        },
        { $set: { mediaIntentId: intent._id } },
        { timeoutMS: 10000 },
      );
      if (stored.modifiedCount !== 1) bad();
      try {
        await runtime.media.upload(String(intent._id), principal, async () => bytes, {
          signal,
          deadline: Math.min(deadline, Date.now() + 90000),
          admit: () => jobs.admit(job.id, job.attemptId, caller),
        });
      } catch {
        await runtime.media.reconcile(String(intent._id), principal, {
          signal,
          admit: () => jobs.admit(job.id, job.attemptId, caller),
        });
      }
      return await complete(
        job,
        { status: 'succeeded', mediaIntentId: String(intent._id) },
        context,
      );
    } catch (error) {
      const call = await Call.findOne({ jobId: job.id, retryCount: job.retryCount })
        .setOptions({ timeoutMS: 10000 })
        .catch(() => null);
      const code =
        error instanceof ProviderFailure
          ? error.code
          : dispatchKnown || call?.dispatchedAt
            ? 'PROVIDER_OUTCOME_UNKNOWN'
            : 'PROVIDER_FAILED';
      if (code === 'QUOTA_EXHAUSTED')
        await Control.updateOne(
          { key: 'quota:' + (job.taskType === 'audio' ? 'tts' : 'translation') },
          { $set: { cooldownUntil: new Date(now() + 60000) } },
          { timeoutMS: 10000 },
        ).catch(() => {});
      await complete(
        job,
        { status: code === 'QUOTA_EXHAUSTED' ? 'waiting_quota' : 'failed', errorCode: code },
        { deadline: Date.now() + 10000, signal: AbortSignal.timeout(10000) },
      ).catch(() => {});
    } finally {
      clearInterval(timer);
      clearTimeout(total);
      await Control.updateOne(
        { key: 'execution', leaseToken: token },
        { $set: { leaseToken: null, leaseExpiresAt: null } },
        { timeoutMS: 10000 },
      ).catch(() => {});
    }
  }
  function original(job) {
    return {
      account: { id: String(job.requestedBy) },
      currentWorkSession: { id: String(job.workSessionId) },
    };
  }
  return {
    async runNext(principal, key) {
      if (closing) bad();
      currentFree();
      let launch = false;
      const token = randomUUID(),
        admissionKey = 'admission:' + principal.account.id + ':' + key;
      let result;
      try {
        result = await tx(async (session) => {
          const old = await Control.findOne({ key: admissionKey }).session(session);
          if (old && +old.expiresAt > now())
            return { jobId: old.jobId ? String(old.jobId) : null, attemptId: old.attemptId };
          if (old) await old.deleteOne({ session });
          if (active) bad('ADAPTER_BUSY', 409);
          const lock = await control('execution', 'execution', session);
          if (+lock.leaseExpiresAt > now()) bad('ADAPTER_BUSY', 409);
          lock.leaseToken = token;
          lock.leaseExpiresAt = new Date(now() + 300000);
          await lock.save({ session });
          const claimed = await jobs.claim(caller, languageCodes, session),
            job = claimed.job;
          await Control.create(
            [
              {
                key: admissionKey,
                kind: 'admission',
                actorId: principal.account.id,
                jobId: job?.id ?? null,
                attemptId: job?.attemptId ?? null,
                expiresAt: new Date(now() + 86400000),
              },
            ],
            { session },
          );
          if (!job) {
            lock.leaseToken = null;
            lock.leaseExpiresAt = null;
            await lock.save({ session });
          }
          launch = Boolean(job);
          return { jobId: job?.id ?? null, attemptId: job?.attemptId ?? null, job };
        });
      } catch (error) {
        if (error instanceof DraftFailure) throw error;
        // A concurrent identical admission may win the unique key during our transaction.
        const replay = await Control.findOne({
          key: admissionKey,
          kind: 'admission',
          expiresAt: { $gt: new Date(now()) },
        })
          .setOptions({ timeoutMS: 10000 })
          .lean()
          .catch(() => null);
        if (replay)
          return {
            status: replay.jobId ? 202 : 200,
            body: {
              data: {
                jobId: replay.jobId ? String(replay.jobId) : null,
                attemptId: replay.attemptId,
              },
            },
          };
        if (error.code === 11000) bad('ADAPTER_BUSY', 409);
        bad();
      }
      if (launch && result.job) {
        const controller = new AbortController();
        const promise = execute(result.job, token, controller)
          .catch(() => {})
          .finally(() => {
            if (active?.token === token) active = null;
          });
        active = { token, controller, promise };
      }
      return {
        status: result.jobId ? 202 : 200,
        body: { data: { jobId: result.jobId, attemptId: result.attemptId } },
      };
    },
    async idle() {
      await active?.promise;
    },
    async close() {
      closing = true;
      active?.controller.abort();
      await active?.promise;
    },
  };
}
