import { randomUUID } from 'node:crypto';

const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
export const vietnamDay = now => formatter.format(new Date(now));
export const sessionView = session => ({ id: String(session._id), workDateVN: session.workDateVN,
  status: session.status, openedAt: session.openedAt.toISOString(), closedAt: session.closedAt?.toISOString() ?? null });
export class SessionError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
const dayEnded = () => new SessionError(409, 'SESSION_DAY_ENDED', 'The work session day has ended');

/** Materialize logical midnight closure without a scheduler or invented close reason. */
export async function reconcileSessions(models, now, staffId) {
  const filter = { status: 'open', workDateVN: { $lt: vietnamDay(now) } };
  if (staffId) filter.staffId = staffId;
  await models.WorkSession.collection.updateMany(filter, [{ $set: { status: 'closed',
    closedAt: { $dateFromString: { dateString: { $concat: ['$workDateVN', 'T17:00:00.000Z'] } } } } }]);
}

/** Retry only known aborted contention, never replay an uncertain commit. */
export async function sessionTransaction(connection, work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const session = await connection.startSession();
    try {
      session.startTransaction({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction().catch(() => {});
      if (error?.hasErrorLabel?.('UnknownTransactionCommitResult')) throw error;
      if (attempt === 2 || !(error?.hasErrorLabel?.('TransientTransactionError') || [11000, 112, 244].includes(error?.code))) throw error;
    } finally { await session.endSession(); }
  }
}

export async function openSession(runtime, staffId) {
  const day = vietnamDay(runtime.now());
  return sessionTransaction(runtime.models.WorkSession.db, async transaction => {
    const record = await runtime.models.WorkSession.findOne({ staffId, workDateVN: day }).session(transaction);
    const now = runtime.now();
    if (vietnamDay(now) !== day) throw dayEnded();
    if (record) {
      if (record.status === 'closed') {
        record.status = 'open'; record.closedAt = null;
        await record.save({ session: transaction });
      }
      return { status: 200, session: sessionView(record) };
    }
    const [created] = await runtime.models.WorkSession.create([{ staffId, workDateVN: day,
      status: 'open', openedAt: new Date(now), closedAt: null }], { session: transaction });
    return { status: 201, session: sessionView(created) };
  });
}

export async function closeSession(runtime, staffId, id, reason) {
  const day = vietnamDay(runtime.now());
  const eventId = randomUUID();
  return sessionTransaction(runtime.models.WorkSession.db, async transaction => {
    const record = await runtime.models.WorkSession.findOne({ _id: id, staffId }).session(transaction);
    if (!record) throw new SessionError(404, 'SESSION_NOT_FOUND', 'Work session was not found');
    const now = runtime.now();
    if (vietnamDay(now) !== day || record.workDateVN !== day) throw dayEnded();
    if (record.status === 'open') {
      record.status = 'closed'; record.closedAt = new Date(now);
      await record.save({ session: transaction });
      await runtime.models.AuditLog.create([{ eventId, actorType: 'account', actorId: staffId,
        workSessionId: record._id, action: 'work_session.close', reason,
        occurredAt: new Date(now), receivedAt: new Date(now), result: { status: 'succeeded', errorCode: null } }], { session: transaction });
    }
    return { status: 200, session: sessionView(record) };
  });
}
