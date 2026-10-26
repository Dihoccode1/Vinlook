import express from 'express';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  AuthorizationError,
  bearerToken,
  currentPrincipal,
  requireAuthority,
} from './authorization.js';
import { sessionTransaction } from './session-state.js';
import { encodeHistoryCursor, decodeHistoryCursor } from './audit-history.js';
import { assertBudget, consumeBudget, rateBucket, RateExceeded } from './auth/rate.js';

const invalid = () =>
  new AuthorizationError(422, 'INVALID_INPUT', 'Invalid staff or recovery input');
const missing = () => new AuthorizationError(404, 'STAFF_NOT_FOUND', 'Staff account was not found');
const conflict = () =>
  new AuthorizationError(409, 'STAFF_STATE_CONFLICT', 'Staff account state has changed');
const failed = () =>
  new AuthorizationError(401, 'RECOVERY_FAILED', 'Password recovery could not be completed');
const reasonSchema = z.strictObject({ reason: z.string().trim().min(1).max(500) });
const password = z
  .string()
  .refine((x) => [...x].length >= 15 && Buffer.byteLength(x, 'utf8') <= 72);
const resetSchema = z
  .strictObject({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .regex(/^[^@\s]+@[^@\s]+$/u),
    code: z.string().min(1).max(128),
    password,
    confirmPassword: z.string(),
  })
  .refine((x) => x.password === x.confirmPassword);
const listSchema = z.strictObject({
  status: z.enum(['pending', 'active', 'locked']).optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d{0,2}$/)
    .transform(Number)
    .refine((x) => x <= 100)
    .optional()
    .default(20),
  cursor: z.string().min(1).max(2048).optional(),
});
const transitions = {
  approve: ['pending', 'active'],
  lock: ['active', 'locked'],
  unlock: ['locked', 'active'],
};

function incrementVersion(account) {
  if (!Number.isSafeInteger(account.authVersion + 1)) throw new Error('Account version exhausted');
  account.authVersion++;
}
function codeHash(code) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return null;
  const bytes = Buffer.from(code, 'base64url');
  return bytes.length === 32 && bytes.toString('base64url') === code
    ? createHash('sha256').update(bytes).digest('hex')
    : null;
}
async function appendAudit(
  runtime,
  transaction,
  actorId,
  targetAccountId,
  action,
  now,
  reason = null,
) {
  await runtime.models.AuditLog.create(
    [
      {
        eventId: randomUUID(),
        actorType: 'account',
        actorId,
        targetAccountId,
        operatorId: null,
        workSessionId: null,
        poiId: null,
        action,
        reason,
        occurredAt: new Date(now),
        receivedAt: new Date(now),
        result: { status: 'succeeded', errorCode: null },
      },
    ],
    { session: transaction },
  );
}
async function targetStaff(runtime, id, transaction) {
  const account = await runtime.models.StaffAccount.findOne({ _id: id, role: 'Staff' })
    .select('+passwordHash')
    .session(transaction);
  if (!account) throw missing();
  return account;
}
export async function changeStaff(runtime, actorId, id, operation) {
  const [expected, next] = transitions[operation];
  return sessionTransaction(runtime.models.StaffAccount.db, async (transaction) => {
    const account = await targetStaff(runtime, id, transaction);
    if (account.status !== expected) throw conflict();
    account.status = next;
    if (operation === 'lock') incrementVersion(account);
    await account.save({ session: transaction });
    await appendAudit(
      runtime,
      transaction,
      actorId,
      account._id,
      `staff.${operation}`,
      runtime.now(),
    );
    return { accountId: String(account._id), status: account.status };
  });
}
export async function issueRecovery(runtime, actorId, id, reason) {
  const raw = randomBytes(32).toString('base64url');
  return sessionTransaction(runtime.models.StaffAccount.db, async (transaction) => {
    const account = await targetStaff(runtime, id, transaction);
    if (!['active', 'locked'].includes(account.status)) throw conflict();
    const now = runtime.now();
    incrementVersion(account); // Shared version write serializes issuance and reset.
    await account.save({ session: transaction });
    await runtime.models.RecoveryCode.updateMany(
      { staffId: account._id, usedAt: null },
      { $min: { expiresAt: new Date(now) } },
      { session: transaction },
    );
    const expiresAt = new Date(now + 900000);
    await runtime.models.RecoveryCode.create(
      [
        {
          staffId: account._id,
          codeHash: codeHash(raw),
          expiresAt,
          usedAt: null,
          issuedBy: actorId,
          issuedByOperator: null,
        },
      ],
      { session: transaction },
    );
    await appendAudit(
      runtime,
      transaction,
      actorId,
      account._id,
      'staff.recovery_code_issue',
      now,
      reason,
    );
    return { accountId: String(account._id), code: raw, expiresAt: expiresAt.toISOString() };
  });
}
function eligibleCode(account, recovery) {
  return (
    account &&
    ['active', 'locked'].includes(account.status) &&
    recovery &&
    (account.role === 'Staff'
      ? recovery.issuedBy != null
      : account.role === 'Manager' && recovery.issuedByOperator != null)
  );
}
export async function resetPassword(runtime, input) {
  const bucket = rateBucket(runtime.config.rateKey, 'reset', 'account', input.email, runtime.now());
  await assertBudget(runtime.models.AuthRateLimit, bucket, 5);
  const hash = codeHash(input.code);
  const account = await runtime.models.StaffAccount.findOne({ email: input.email });
  const recovery =
    hash && account
      ? await runtime.models.RecoveryCode.findOne({
          staffId: account._id,
          codeHash: hash,
          usedAt: null,
          expiresAt: { $gt: new Date(runtime.now()) },
        })
      : null;
  const reject = async () => {
    await consumeBudget(runtime.models.AuthRateLimit, bucket, 5);
    throw failed();
  };
  if (!eligibleCode(account, recovery)) return reject();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    await sessionTransaction(runtime.models.StaffAccount.db, async (transaction) => {
      const current = await runtime.models.StaffAccount.findById(account._id)
        .select('+passwordHash')
        .session(transaction);
      const now = runtime.now();
      const code = await runtime.models.RecoveryCode.findOne({
        _id: recovery._id,
        staffId: account._id,
        codeHash: hash,
        usedAt: null,
        expiresAt: { $gt: new Date(now) },
      }).session(transaction);
      if (!eligibleCode(current, code)) throw failed();
      incrementVersion(current);
      current.passwordHash = passwordHash;
      await current.save({ session: transaction });
      code.usedAt = new Date(now);
      await code.save({ session: transaction });
      await runtime.models.RecoveryCode.updateMany(
        { staffId: current._id, usedAt: null },
        { $min: { expiresAt: new Date(now) } },
        { session: transaction },
      );
      await appendAudit(
        runtime,
        transaction,
        current._id,
        current._id,
        `${current.role === 'Staff' ? 'staff' : 'manager'}.password_reset`,
        now,
      );
    });
    return { reset: true };
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'RECOVERY_FAILED') return reject();
    throw error;
  }
}

export function staffRecoveryRouter(runtime) {
  const router = express.Router();
  const prepare = (method) => (request, response, next) => {
    response.locals.requestId = randomUUID();
    response.set('Cache-Control', 'no-store').vary('Origin');
    const origin = request.get('Origin');
    if (origin && !runtime.config.origins.includes(origin))
      throw new AuthorizationError(403, 'ACCESS_DENIED', 'Access is denied');
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const headers = (request.get('Access-Control-Request-Headers') ?? '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
      if (
        request.get('Access-Control-Request-Method') !== method ||
        headers.some((x) => !['authorization', 'content-type'].includes(x))
      )
        throw invalid();
      return response
        .set('Access-Control-Allow-Methods', `${method}, OPTIONS`)
        .set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        .status(204)
        .end();
    }
    next();
  };
  router.options('/auth/reset-password', prepare('POST'));
  router.post(
    '/auth/reset-password',
    prepare('POST'),
    async (request, _response, next) => {
      await consumeBudget(
        runtime.models.AuthRateLimit,
        rateBucket(runtime.config.rateKey, 'reset', 'ip', request.ip, runtime.now()),
        30,
      );
      next();
    },
    express.json({ limit: '16kb' }),
    async (request, response) => {
      const input = resetSchema.safeParse(request.body);
      if (!input.success || Object.keys(request.query).length) throw invalid();
      response.json({
        data: await resetPassword(runtime, input.data),
        requestId: response.locals.requestId,
      });
    },
  );
  router.options('/staff', prepare('GET'));
  router.use('/staff', prepare('POST'), async (request, response, next) => {
    response.locals.principal = requireAuthority(
      await currentPrincipal(bearerToken(request.get('Authorization')), runtime),
      { roles: ['Manager'] },
    );
    next();
  });
  router.get('/staff', async (request, response) => {
    if (Number(request.get('content-length') ?? 0) > 0 || request.get('transfer-encoding'))
      throw invalid();
    const query = listSchema.safeParse(request.query);
    if (!query.success) throw invalid();
    const { status, limit, cursor } = query.data;
    const principal = response.locals.principal;
    const context = {
      endpoint: 'staff',
      requester: principal.account.id,
      role: principal.account.role,
      filters: status ? { status } : {},
    };
    const last = cursor ? decodeHistoryCursor(runtime.config.rateKey, cursor, context) : null;
    const records = await runtime.models.StaffAccount.find({
      role: 'Staff',
      ...(status ? { status } : {}),
      ...(last ? { _id: { $lt: last.id } } : {}),
    })
      .sort({ _id: -1 })
      .limit(limit + 1);
    const page = records.slice(0, limit);
    const items = page.map((account) => ({
      id: String(account._id),
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }));
    const tail = page.at(-1);
    response.json({
      data: {
        items,
        nextCursor:
          records.length > limit
            ? encodeHistoryCursor(runtime.config.rateKey, context, {
                value: String(tail._id),
                id: String(tail._id),
              })
            : null,
      },
      requestId: response.locals.requestId,
    });
  });
  router.use('/staff', express.json({ limit: '16kb' }));
  for (const operation of [...Object.keys(transitions), 'recovery-codes']) {
    router.post(`/staff/:id/${operation}`, async (request, response) => {
      if (!/^[a-fA-F0-9]{24}$/.test(request.params.id) || Object.keys(request.query).length)
        throw invalid();
      const input = (
        operation === 'recovery-codes'
          ? reasonSchema
          : z.strictObject({ expectedStatus: z.literal(transitions[operation][0]) })
      ).safeParse(request.body);
      if (!input.success) throw invalid();
      const actorId = response.locals.principal.account.id;
      const data =
        operation === 'recovery-codes'
          ? await issueRecovery(runtime, actorId, request.params.id, input.data.reason)
          : await changeStaff(runtime, actorId, request.params.id, operation);
      response
        .status(operation === 'recovery-codes' ? 201 : 200)
        .json({ data, requestId: response.locals.requestId });
    });
  }
  router.use((error, _request, response, _next) => {
    let safe =
      error instanceof AuthorizationError
        ? error
        : new AuthorizationError(
            503,
            'DEPENDENCY_UNAVAILABLE',
            'Staff recovery is temporarily unavailable',
          );
    if (error instanceof RateExceeded) {
      response.set('Retry-After', String(error.retryAfter));
      safe = new AuthorizationError(429, 'RATE_LIMITED', 'Too many recovery attempts');
    }
    if (error?.type === 'entity.parse.failed')
      safe = new AuthorizationError(400, 'MALFORMED_JSON', 'Malformed JSON');
    if (error?.type === 'entity.too.large')
      safe = new AuthorizationError(413, 'BODY_TOO_LARGE', 'Staff recovery body is too large');
    response.status(safe.status).json({
      error: { code: safe.code, message: safe.message, requestId: response.locals.requestId },
    });
  });
  return router;
}
