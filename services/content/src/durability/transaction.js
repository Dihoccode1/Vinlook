import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  MutationFailure,
  checked,
  id,
  uuid,
  operations,
  eventSchema,
  resultSchema,
  requestHash,
} from './validation.js';
const inputSchema = z.strictObject({
  actorId: id,
  workSessionId: id,
  operation: z.enum(operations),
  key: uuid,
  targetId: id.nullable(),
  input: z.unknown(),
});
/** Internal primitive: caller must freshly authorize, validate business input and use only the supplied session. */
export async function executeMutation(
  connection,
  models,
  input,
  mutate,
  now = Date.now,
  budgetContext = null,
) {
  const remaining = () => {
    if (!budgetContext) return 10000;
    if (
      budgetContext.signal?.aborted ||
      !Number.isFinite(budgetContext.deadline) ||
      budgetContext.deadline <= Date.now()
    )
      throw new MutationFailure('PUBLICATION_VERIFICATION_UNAVAILABLE');
    return Math.max(1, Math.min(10000, budgetContext.deadline - Date.now()));
  };
  const value = checked(inputSchema, input);
  const hash = requestHash({
    operation: value.operation,
    targetId: value.targetId,
    body: value.input,
  });
  const scope = { actorId: value.actorId, operation: value.operation, key: value.key };
  const createdAt = new Date(now());
  if (!Number.isFinite(createdAt.getTime()))
    throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
  const context = Object.freeze({
    actorId: value.actorId,
    workSessionId: value.workSessionId,
    occurredAt: createdAt.toISOString(),
  });
  const eventIds = [];
  const replay = (record) => {
    if (!record) return null;
    if (record.status !== 'completed')
      throw new MutationFailure('IDEMPOTENCY_RECONCILIATION_REQUIRED');
    if (new Date(record.expiresAt).getTime() <= now()) return null;
    if (record.requestHash !== hash) throw new MutationFailure('IDEMPOTENCY_CONFLICT', 409);
    const body = checked(resultSchema, record.responseBody);
    return { status: record.responseStatus, body, replayed: true };
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    remaining();
    let output;
    let session;
    try {
      session = await connection.startSession();
    } catch {
      throw new MutationFailure();
    }
    try {
      await session.withTransaction(
        async () => {
          const old = await models.IdempotencyRecord.findOne(scope).session(session).lean();
          output = replay(old);
          if (output) return;
          if (old)
            await models.IdempotencyRecord.deleteOne(
              { _id: old._id, status: 'completed' },
              { session },
            );
          const [record] = await models.IdempotencyRecord.create(
            [
              {
                ...scope,
                requestHash: hash,
                status: 'in_progress',
                createdAt,
                expiresAt: new Date(createdAt.getTime() + 86400000),
              },
            ],
            { session },
          );
          const result = await mutate(session, context);
          remaining();
          const body = checked(resultSchema, result.body);
          if (
            !Number.isInteger(result.status) ||
            result.status < 200 ||
            result.status > 299 ||
            !Array.isArray(result.events) ||
            !result.events.length
          )
            throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
          for (let i = 0; i < result.events.length; i++) {
            eventIds[i] ??= randomUUID();
            const event = checked(eventSchema, {
              ...result.events[i],
              ...context,
              eventId: eventIds[i],
            });
            await models.AuditOutbox.create(
              [
                {
                  eventId: event.eventId,
                  payload: event,
                  createdAt,
                  nextAttemptAt: createdAt,
                  attemptCount: 0,
                },
              ],
              { session },
            );
          }
          record.status = 'completed';
          record.responseStatus = result.status;
          record.responseBody = body;
          await record.save({ session });
          output = { status: result.status, body, replayed: false };
        },
        {
          timeoutMS: remaining(),
          maxCommitTimeMS: Math.min(3000, remaining()),
          readPreference: 'primary',
          writeConcern: { w: 'majority' },
        },
      );
      return output;
    } catch (error) {
      if (error instanceof MutationFailure) throw error;
      try {
        const found = replay(
          await models.IdempotencyRecord.findOne(scope)
            .setOptions({ timeoutMS: remaining() })
            .lean(),
        );
        if (found) return found;
      } catch (readError) {
        if (readError instanceof MutationFailure) throw readError;
      }
      if (
        !(error.code === 11000 || error.hasErrorLabel?.('TransientTransactionError')) ||
        attempt === 2
      )
        throw new MutationFailure();
    } finally {
      await session.endSession();
    }
  }
  throw new MutationFailure();
}
