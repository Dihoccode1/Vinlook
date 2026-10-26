import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { MediaFailure } from './validation.js';
import { probeMedia } from './probe.js';
import { canonical, MutationFailure } from '../durability/validation.js';
const budgets = new AsyncLocalStorage();
function dbOptions() {
  const b = budgets.getStore();
  const left = b ? b.deadline - Date.now() : 10000;
  if (b?.signal?.aborted || left <= 0) throw new MediaFailure();
  return { timeoutMS: Math.min(left, 10000), maxTimeMS: Math.min(left, 10000) };
}
let activeUpload = false; // One process-wide slot shared by staff and internal audio primitives.
export function createMediaService(
  runtime,
  provider,
  { probe = probeMedia, mode = 'production' } = {},
) {
  const { models, now = Date.now } = runtime;
  const Model = models.MediaUpload;
  const asset = (row) =>
    row.status !== 'verified'
      ? null
      : {
          publicId: row.publicId,
          url: row.url,
          format: row.format,
          ...(row.kind === 'audio'
            ? {
                textVersion: row.textVersion,
                registryVersion: row.registryVersion,
                voiceOrModelId: row.voiceOrModelId,
              }
            : {}),
        };
  const view = (row) => ({
    id: String(row._id),
    status: row.status,
    kind: row.kind,
    poiId: String(row.poiId),
    revisionId: String(row.revisionId),
    actorId: String(row.actorId),
    workSessionId: String(row.workSessionId),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    attachedAt: row.attachedAt,
    safeErrorCode: row.safeErrorCode,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    bitrate: row.bitrate,
    jobId: row.jobId ? String(row.jobId) : null,
    sourceVersion: row.sourceVersion,
    textVersion: row.textVersion,
    languageCode: row.languageCode,
    asset: asset(row),
  });
  async function target(revisionId, expectedEditVersion, source) {
    const revision = await models.POIRevision.findById(revisionId).setOptions(dbOptions());
    if (!revision) throw new MediaFailure('MEDIA_NOT_FOUND', 404);
    const poi = await models.POI.findById(revision.poiId).setOptions(dbOptions());
    if (
      !poi ||
      poi.deletedAt ||
      revision.status !== 'draft' ||
      (!source && revision.editVersion !== expectedEditVersion)
    )
      throw new MediaFailure('EDIT_VERSION_CONFLICT', 409);
    if (source) {
      const row = await models.LocalizedContent.findOne({
        revisionId,
        languageCode: source.languageCode,
      }).setOptions(dbOptions());
      if (
        !row ||
        revision.sourceVersion !== source.sourceVersion ||
        row.sourceVersion !== source.sourceVersion ||
        row.textVersion !== source.textVersion
      )
        throw new MediaFailure('EDIT_VERSION_CONFLICT', 409);
    }
    return { poi, revision };
  }
  async function lookup(id, principal, own) {
    const row = await Model.findById(id).setOptions(dbOptions());
    if (!row || (own && String(row.actorId) !== principal.account.id))
      throw new MediaFailure('MEDIA_NOT_FOUND', 404);
    return row;
  }
  async function issue(revisionId, input, principal, audio = null) {
    const { poi } = await target(revisionId, input.expectedEditVersion, audio);
    const uploadId = randomUUID(),
      kind = audio ? 'audio' : 'thumbnail';
    const createdAt = new Date(now());
    const row = new Model({
      uploadId,
      kind,
      poiId: poi._id,
      revisionId,
      actorId: principal.account.id,
      workSessionId: principal.currentWorkSession.id,
      expectedEditVersion: input.expectedEditVersion,
      ...(audio
        ? {
            jobId: audio.jobId,
            attemptId: audio.attemptId,
            sourceVersion: audio.sourceVersion,
            textVersion: audio.textVersion,
            languageCode: audio.languageCode,
            registryVersion: audio.registryVersion,
            voiceOrModelId: audio.voiceOrModelId,
          }
        : {}),
      publicId: `vinlook/${mode}/${poi._id}/${revisionId}/${kind}/${uploadId}`,
      resourceType: audio ? 'video' : 'image',
      status: 'issued',
      createdAt,
      expiresAt: new Date(+createdAt + 900000),
    });
    await row.save(dbOptions());
    return row;
  }
  async function terminal(row, fields, states = ['uploading', 'uncertain']) {
    row.set(fields);
    await row.validate();
    const result = await Model.updateOne(
      { _id: row._id, status: { $in: states } },
      { $set: fields },
      dbOptions(),
    );
    if (result.modifiedCount !== 1) throw new MediaFailure('MEDIA_RECONCILIATION_REQUIRED', 409);
    return row;
  }
  async function verify(row, signal) {
    const result = await provider.verify(row.toObject(), signal);
    return terminal(row, {
      ...result,
      status: 'verified',
      finishedAt: new Date(now()),
      safeErrorCode: null,
    });
  }
  return {
    async issueThumbnail(revisionId, input, principal) {
      const row = await issue(revisionId, input, principal);
      return {
        intentId: String(row._id),
        status: row.status,
        expiresAt: row.expiresAt,
        uploadPath: `/api/v1/admin/media-intents/${row._id}/file`,
      };
    },
    // Server-only: TASK016 must supply an authenticated, verified immutable job snapshot.
    async issueAudio(snapshot, principal) {
      return issue(
        snapshot.revisionId,
        { expectedEditVersion: snapshot.expectedEditVersion },
        principal,
        snapshot,
      );
    },
    async status(id, principal) {
      return view(await lookup(id, principal, false));
    },
    async upload(id, principal, readBody, { signal, deadline = Date.now() + 90000, admit } = {}) {
      return budgets.run({ deadline: Math.min(deadline, Date.now() + 90000), signal }, async () => {
        if (activeUpload) throw new MediaFailure('UPLOAD_BUSY');
        activeUpload = true;
        const controller = new AbortController(),
          total = setTimeout(() => controller.abort(), 90000),
          combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
        budgets.getStore().signal = combined;
        let row,
          providerStarted = false;
        try {
          row = await lookup(id, principal, true);
          if (admit) await admit(row);
          if (String(row.workSessionId) !== principal.currentWorkSession.id)
            throw new MediaFailure('ACCESS_DENIED', 403);
          if (row.status === 'verified') {
            const bytes = await readBody(row.kind, combined),
              result = await probe(row.kind, bytes, { signal: combined });
            if (result.metadata.sha256 !== row.sha256)
              throw new MediaFailure('MEDIA_INTENT_CONFLICT', 409);
            return {
              status: 200,
              data: {
                intentId: String(row._id),
                status: 'verified',
                asset: asset(row),
                ...(row.kind === 'audio'
                  ? { durationSeconds: row.durationSeconds, bitrate: row.bitrate }
                  : {}),
              },
            };
          }
          if (row.status !== 'issued') throw new MediaFailure('MEDIA_RECONCILIATION_REQUIRED', 409);
          if (now() >= +row.expiresAt) throw new MediaFailure('MEDIA_INTENT_EXPIRED', 409);
          if (admit) await admit(row);
          await target(row.revisionId, row.expectedEditVersion, row.kind === 'audio' ? row : null);
          row = await Model.findOneAndUpdate(
            { _id: row._id, status: 'issued', expiresAt: { $gt: new Date(now()) } },
            { $set: { status: 'uploading', startedAt: new Date(now()) } },
            { returnDocument: 'after', ...dbOptions() },
          );
          if (!row) throw new MediaFailure('MEDIA_RECONCILIATION_REQUIRED', 409);
          const input = await readBody(row.kind, combined),
            result = await probe(row.kind, input, { signal: combined });
          row.set(result.metadata);
          await row.save(dbOptions()); // Durable digest precedes provider side effect.
          if (admit) await admit(row);
          await target(row.revisionId, row.expectedEditVersion, row.kind === 'audio' ? row : null);
          if (combined.aborted) throw new MediaFailure();
          providerStarted = true;
          row.providerVersion = await provider.upload(row.toObject(), result.bytes, combined);
          await verify(row, combined);
          return {
            status: 201,
            data: {
              intentId: String(row._id),
              status: 'verified',
              asset: asset(row),
              ...(row.kind === 'audio'
                ? { durationSeconds: row.durationSeconds, bitrate: row.bitrate }
                : {}),
            },
          };
        } catch (error) {
          if (row?.status === 'uploading') {
            const fields = {
              status: providerStarted && !error.definitiveUpload ? 'uncertain' : 'rejected',
              finishedAt: new Date(now()),
              safeErrorCode: providerStarted
                ? error.definitiveUpload
                  ? 'UPLOAD_FAILED'
                  : 'UPLOAD_UNCERTAIN'
                : error.code === 'EDIT_VERSION_CONFLICT'
                  ? 'STALE_INPUT'
                  : error.status === 422 || error.status === 400 || error.status === 413
                    ? 'INVALID_MEDIA'
                    : 'DEPENDENCY_UNAVAILABLE',
              providerVersion: null,
            };
            await terminal(row, fields, ['uploading']).catch(() => {}); // Never claim cleanup or rollback of provider bytes.
          }
          throw error instanceof MutationFailure ? error : new MediaFailure();
        } finally {
          clearTimeout(total);
          activeUpload = false;
        }
      });
    },
    async reconcile(id, principal, { signal, admit } = {}) {
      const row = await lookup(id, principal, true);
      if (admit) await admit(row);
      if (
        !['uploading', 'uncertain', 'verified'].includes(row.status) ||
        (row.status === 'uploading' && now() < +row.startedAt + 90000)
      )
        throw new MediaFailure('MEDIA_RECONCILIATION_REQUIRED', 409);
      try {
        if (row.status === 'verified') {
          await provider.verify(row.toObject(), signal);
          return view(row);
        }
        await verify(row, signal);
        return view(row);
      } catch {
        if (row.status !== 'verified')
          await terminal(row, {
            status: 'uncertain',
            safeErrorCode: 'DEPENDENCY_UNAVAILABLE',
            finishedAt: new Date(now()),
          }).catch(() => {});
        throw new MediaFailure();
      }
    },
    async verifyThumbnail(ref, { poiId, signal, deadline } = {}) {
      const row = await Model.findOne({
        status: 'verified',
        kind: 'thumbnail',
        publicId: ref.publicId,
        poiId,
      }).setOptions(
        deadline ? { timeoutMS: Math.max(1, Math.min(10000, deadline - Date.now())) } : dbOptions(),
      );
      if (!poiId || !row || canonical(asset(row)) !== canonical(ref)) return false;
      await provider.verify(row.toObject(), signal);
      return true;
    },
    async attachThumbnail(session, ref, { poiId }) {
      const row = await Model.findOne({
        status: 'verified',
        kind: 'thumbnail',
        publicId: ref.publicId,
        poiId,
      }).session(session);
      if (!row || canonical(asset(row)) !== canonical(ref))
        throw new MediaFailure('INVALID_MEDIA_REFERENCE', 422);
      if (row.attachedAt === null)
        await Model.updateOne(
          { _id: row._id, status: 'verified', attachedAt: null },
          { $set: { attachedAt: new Date(now()) } },
          { session },
        );
    },
    async verifyAudioReference(
      ref,
      { poiId, sourceVersion, textVersion, languageCode, signal, deadline },
    ) {
      const row = await Model.findOne({
        status: 'verified',
        kind: 'audio',
        publicId: ref.publicId,
        poiId,
        sourceVersion,
        textVersion,
        languageCode,
      }).setOptions(
        deadline ? { timeoutMS: Math.max(1, Math.min(10000, deadline - Date.now())) } : dbOptions(),
      );
      if (!poiId || !row || canonical(asset(row)) !== canonical(ref)) return false;
      await provider.verify(row.toObject(), signal);
      return { durationSeconds: row.durationSeconds, bitrate: row.bitrate };
    },
  };
}
