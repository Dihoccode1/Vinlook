import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { AuthorizationError, bearerToken, currentPrincipal, validCaller } from './authorization.js';
import { reconcileSessions, sessionView } from './session-state.js';

const id = z.string().regex(/^[a-fA-F0-9]{24}$/).transform(x => x.toLowerCase());
const iso = z.string().refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const actions = ['poi.create', 'poi.update', 'poi.delete', 'poi.restore', 'revision.submit', 'revision.return',
  'revision.publish', 'content.review', 'job.create', 'job.retry', 'job.complete'];
const result = z.strictObject({ status: z.enum(['succeeded', 'failed']),
  errorCode: z.enum(['VALIDATION_FAILED', 'CONFLICT', 'DEPENDENCY_UNAVAILABLE', 'PROCESSING_FAILED']).nullable() })
  .refine(value => value.status === 'succeeded' ? value.errorCode === null : value.errorCode !== null);
const eventInput = z.strictObject({ eventId: z.uuid().transform(x => x.toLowerCase()), actorId: id, workSessionId: id,
  action: z.enum(actions), poiId: id, occurredAt: iso, result,
  reason: z.string().trim().min(1).max(500).nullable().optional().default(null) });
const common = { staffId: id.optional(), dateFrom: day.optional(), dateTo: day.optional(),
  limit: z.string().regex(/^[1-9]\d{0,2}$/).transform(Number).refine(x => x <= 100).optional().default(20),
  cursor: z.string().min(1).max(2048).optional() };
const sessionQuery = z.strictObject({ ...common, status: z.enum(['open', 'closed']).optional() });
const auditQuery = z.strictObject({ ...common, workSessionId: id.optional(), poiId: id.optional(),
  action: z.string().regex(/^[A-Za-z0-9_.]{1,100}$/).optional(), actorType: z.enum(['account', 'operator']).optional() });
const cursorSchema = z.strictObject({ p: z.strictObject({ v: z.literal(1), endpoint: z.enum(['sessions', 'audit']),
  requester: id, role: z.enum(['Staff', 'Manager']), filters: z.record(z.string(), z.string()),
  last: z.strictObject({ value: z.string(), id }) }), s: z.string().regex(/^[a-f0-9]{64}$/) });
const invalid = () => new AuthorizationError(422, 'INVALID_INPUT', 'Invalid audit or history input');
const forbidden = () => new AuthorizationError(403, 'ACCESS_DENIED', 'Access is denied');
const missing = () => new AuthorizationError(404, 'SESSION_NOT_FOUND', 'Work session was not found');
const conflict = () => new AuthorizationError(409, 'AUDIT_EVENT_CONFLICT', 'The audit event conflicts with an existing event');

function semantic(record) {
  return { eventId: record.eventId, actorId: String(record.actorId), workSessionId: String(record.workSessionId),
    action: record.action, poiId: String(record.poiId), occurredAt: new Date(record.occurredAt).toISOString(),
    result: { status: record.result.status, errorCode: record.result.errorCode }, reason: record.reason ?? null };
}
export async function ingestAudit(runtime, input) {
  const parsed = eventInput.safeParse(input);
  if (!parsed.success) throw invalid();
  const value = parsed.data;
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await runtime.models.AuditLog.findOne({ eventId: value.eventId });
    if (existing) {
      if (existing.actorType !== 'account' || JSON.stringify(semantic(existing)) !== JSON.stringify(semantic(value))) throw conflict();
      return { status: 200, eventId: existing.eventId, receivedAt: existing.receivedAt.toISOString() };
    }
    const [actor, session] = await Promise.all([
      runtime.models.StaffAccount.exists({ _id: value.actorId }),
      runtime.models.WorkSession.findOne({ _id: value.workSessionId, staffId: value.actorId }),
    ]);
    const receivedAt = new Date(runtime.now());
    if (!actor || !session || new Date(value.occurredAt) < session.openedAt || new Date(value.occurredAt) > receivedAt) throw invalid();
    try {
      await runtime.models.AuditLog.create({ ...value, occurredAt: new Date(value.occurredAt), receivedAt,
        actorType: 'account', operatorId: null, targetAccountId: null });
      return { status: 201, eventId: value.eventId, receivedAt: receivedAt.toISOString() };
    } catch (error) { if (error?.code !== 11000) throw error; }
  }
  throw new Error('Audit contention');
}

function cursorKey(secret) { return createHmac('sha256', secret).update('vinlook:history-cursor:v1').digest(); }
const signature = (key, payload) => createHmac('sha256', key).update(JSON.stringify(payload)).digest('hex');
export function encodeHistoryCursor(secret, context, last) {
  const p = { v: 1, ...context, last };
  return Buffer.from(JSON.stringify({ p, s: signature(cursorKey(secret), p) })).toString('base64url');
}
export function decodeHistoryCursor(secret, token, context) {
  try {
    if (typeof token !== 'string' || token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalid();
    const bytes = Buffer.from(token, 'base64url');
    if (bytes.toString('base64url') !== token) throw invalid();
    const value = cursorSchema.parse(JSON.parse(bytes.toString('utf8')));
    if (!timingSafeEqual(Buffer.from(value.s, 'hex'), Buffer.from(signature(cursorKey(secret), value.p), 'hex'))) throw invalid();
    const { v: _v, last, ...binding } = value.p;
    if (JSON.stringify(binding) !== JSON.stringify(context)) throw invalid();
    if (!(context.endpoint === 'sessions' ? day : iso).safeParse(last.value).success) throw invalid();
    return last;
  } catch { throw invalid(); }
}

export async function listHistory(runtime, principal, endpoint, query) {
  const parsed = (endpoint === 'sessions' ? sessionQuery : auditQuery).safeParse(query);
  if (!parsed.success) throw invalid();
  const { limit, cursor, ...filters } = parsed.data;
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) throw invalid();
  const staff = principal.account.role === 'Staff';
  if (staff && (filters.staffId && filters.staffId !== principal.account.id || filters.actorType === 'operator')) throw forbidden();
  const staffId = staff ? principal.account.id : filters.staffId;
  if (filters.workSessionId) {
    const owned = await runtime.models.WorkSession.exists({ _id: filters.workSessionId, ...(staff ? { staffId: principal.account.id } : {}) });
    if (!owned) throw missing();
  }
  const normalized = Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
  const context = { endpoint, requester: principal.account.id, role: principal.account.role, filters: normalized };
  const last = cursor ? decodeHistoryCursor(runtime.config.rateKey, cursor, context) : null;
  const mongo = {};
  if (endpoint === 'sessions') {
    await reconcileSessions(runtime.models, runtime.now(), staffId);
    if (staffId) mongo.staffId = staffId;
    if (filters.status) mongo.status = filters.status;
    if (filters.dateFrom || filters.dateTo) mongo.workDateVN = {
      ...(filters.dateFrom ? { $gte: filters.dateFrom } : {}), ...(filters.dateTo ? { $lte: filters.dateTo } : {}) };
  } else {
    if (staffId) mongo.actorId = staffId;
    if (staff) mongo.actorType = 'account'; else if (filters.actorType) mongo.actorType = filters.actorType;
    for (const field of ['workSessionId', 'poiId', 'action']) if (filters[field]) mongo[field] = filters[field];
    if (filters.dateFrom || filters.dateTo) mongo.occurredAt = {
      ...(filters.dateFrom ? { $gte: new Date(`${filters.dateFrom}T00:00:00.000+07:00`) } : {}),
      ...(filters.dateTo ? { $lt: new Date(Date.parse(`${filters.dateTo}T00:00:00.000+07:00`) + 86400000) } : {}) };
  }
  const sortField = endpoint === 'sessions' ? 'workDateVN' : 'occurredAt';
  if (last) {
    const value = endpoint === 'sessions' ? last.value : new Date(last.value);
    mongo.$or = [{ [sortField]: { $lt: value } }, { [sortField]: value, _id: { $lt: last.id } }];
  }
  const model = endpoint === 'sessions' ? runtime.models.WorkSession : runtime.models.AuditLog;
  const records = await model.find(mongo).sort({ [sortField]: -1, _id: -1 }).limit(limit + 1);
  const page = records.slice(0, limit);
  const items = page.map(record => endpoint === 'sessions' ? { ...sessionView(record), staffId: String(record.staffId) } : {
    id: String(record._id), eventId: record.eventId, actorType: record.actorType, actorId: record.actorId ? String(record.actorId) : null,
    operatorId: record.operatorId, workSessionId: record.workSessionId ? String(record.workSessionId) : null,
    action: record.action, poiId: record.poiId ? String(record.poiId) : null,
    targetAccountId: record.targetAccountId ? String(record.targetAccountId) : null, reason: record.reason,
    occurredAt: record.occurredAt.toISOString(), receivedAt: record.receivedAt.toISOString(),
    result: { status: record.result.status, errorCode: record.result.errorCode } });
  const tail = page.at(-1);
  return { items, nextCursor: records.length > limit ? encodeHistoryCursor(runtime.config.rateKey, context,
    { value: endpoint === 'sessions' ? tail.workDateVN : tail.occurredAt.toISOString(), id: String(tail._id) }) : null };
}

export function auditHistoryRouter(runtime) {
  const router = express.Router();
  const prepare = (request, response, next) => {
    response.locals.requestId = randomUUID(); response.set('Cache-Control', 'no-store'); next();
  };
  router.post('/internal/audit-events', prepare, (request, _response, next) => {
    if (request.get('Origin') !== undefined || request.get('X-Vinlook-Service') !== 'content'
      || !runtime.callers || !validCaller(request, runtime.callers, runtime.now())) {
      throw new AuthorizationError(401, 'SERVICE_AUTHENTICATION_FAILED', 'Service authentication failed');
    }
    next();
  }, express.json({ limit: '16kb' }), async (request, response) => {
    if (Object.keys(request.query).length) throw invalid();
    const { status, ...data } = await ingestAudit(runtime, request.body);
    response.status(status).json({ data, requestId: response.locals.requestId });
  });
  for (const [path, endpoint] of [['/work-sessions', 'sessions'], ['/audit-logs', 'audit']]) {
    router.route(path).all(prepare, (request, response, next) => {
      response.vary('Origin'); const origin = request.get('Origin');
      if (origin && !runtime.config.origins.includes(origin)) throw forbidden();
      if (origin) response.set('Access-Control-Allow-Origin', origin);
      if (request.method === 'OPTIONS') {
        const headers = (request.get('Access-Control-Request-Headers') ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        if (request.get('Access-Control-Request-Method') !== 'GET' || headers.some(x => !['authorization', 'content-type'].includes(x))) throw forbidden();
        return response.set('Access-Control-Allow-Methods', 'GET, OPTIONS').set('Access-Control-Allow-Headers', 'Authorization, Content-Type').status(204).end();
      }
      next();
    }).get(async (request, response) => {
      if (Number(request.get('content-length') ?? 0) > 0 || request.get('transfer-encoding')) throw invalid();
      const principal = await currentPrincipal(bearerToken(request.get('Authorization')), runtime);
      response.json({ data: await listHistory(runtime, principal, endpoint, request.query), requestId: response.locals.requestId });
    });
  }
  router.use((error, _request, response, _next) => {
    let safe = error instanceof AuthorizationError ? error : new AuthorizationError(503, 'DEPENDENCY_UNAVAILABLE', 'Audit history is temporarily unavailable');
    if (error?.type === 'entity.parse.failed') safe = new AuthorizationError(400, 'MALFORMED_JSON', 'Malformed JSON');
    if (error?.type === 'entity.too.large') safe = new AuthorizationError(413, 'BODY_TOO_LARGE', 'Audit body is too large');
    response.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId: response.locals.requestId } });
  });
  return router;
}
