import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createIdentityModels } from './models/index.js';
import { verifyIdentityIndexes } from './auth/runtime.js';
import { sessionTransaction } from './session-state.js';

export const bootstrapEventId = 'operator:manager-bootstrap:v1';
const commands = ['bootstrap-manager', 'recover-manager', 'unlock-manager'];
export class OperatorError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refused = () => new OperatorError('OPERATOR_REFUSED', 'Operator preconditions were not satisfied');
const invalid = () => new OperatorError('INVALID_OPERATOR_INPUT', 'Invalid operator input');
const targetSchema = z.strictObject({ email: z.string().trim().toLowerCase().max(254).regex(/^[^@\s]+@[^@\s]+$/u),
  reason: z.string().trim().min(1).max(500),
  fullName: z.string().trim().refine(value => [...value].length >= 1 && [...value].length <= 100).optional() });
const passwordSchema = z.strictObject({ password: z.string().refine(value => [...value].length >= 15 && Buffer.byteLength(value, 'utf8') <= 72),
  confirmPassword: z.string() }).refine(value => value.password === value.confirmPassword);

export function parseOperatorArguments(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (!commands.includes(args[0]) || args.length > 2 || args.length === 2 && args[1] !== '--apply') throw invalid();
  return { command: args[0], apply: args[1] === '--apply' };
}
export function loadOperatorConfig(environment = process.env) {
  const mode = environment.NODE_ENV ?? 'development';
  const uri = environment.IDENTITY_OPERATOR_MONGODB_URI;
  const alias = environment.IDENTITY_OPERATOR_ALIAS;
  const verifier = environment.IDENTITY_OPERATOR_KEY_SHA256;
  if (!['development', 'test', 'production'].includes(mode) || typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(uri)
    || !/^[A-Za-z0-9._-]{1,100}$/.test(alias ?? '') || !/^[a-f0-9]{64}$/.test(verifier ?? '')) throw invalid();
  const database = uri.slice(uri.indexOf('://') + 3).split('?')[0].split('/').slice(1).join('/');
  if (database !== 'vinlook_identity' && !(mode === 'test' && database === 'vinlook_identity_task010')) throw invalid();
  return Object.freeze({ mode, uri, alias, verifier }); // Private; never serialize.
}
export function authenticateOperator(config, value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw refused();
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== value
    || !timingSafeEqual(createHash('sha256').update(bytes).digest(), Buffer.from(config.verifier, 'hex'))) throw refused();
}
export async function connectOperator(config) {
  const connection = mongoose.createConnection(config.uri, { autoCreate: false, autoIndex: false,
    bufferCommands: false, serverSelectionTimeoutMS: 3000 });
  try {
    await connection.asPromise();
    const models = createIdentityModels(connection);
    await verifyIdentityIndexes(models);
    return { models, now: Date.now, close: () => connection.close() };
  } catch { await connection.close().catch(() => {}); throw new OperatorError('OPERATOR_DEPENDENCY_UNAVAILABLE', 'Operator database is unavailable or unverified'); }
}
async function preflight(runtime, command, target, transaction) {
  const options = transaction ? { session: transaction } : {};
  if (command === 'bootstrap-manager') {
    // A Mongo session cannot run parallel operations inside a transaction.
    const manager = await runtime.models.StaffAccount.exists({ role: 'Manager' }, options);
    const email = await runtime.models.StaffAccount.exists({ email: target.email }, options);
    const history = await runtime.models.AuditLog.exists({ eventId: bootstrapEventId }, options);
    if (manager || email || history) throw refused();
    return null;
  }
  const account = await runtime.models.StaffAccount.findOne({ email: target.email, role: 'Manager' }).select('+passwordHash').session(transaction ?? null);
  if (!account) throw refused();
  if (!(command === 'unlock-manager' ? account.status === 'locked' : ['active', 'locked'].includes(account.status))) {
    const error = refused(); error.verifiedTarget = account._id; throw error;
  }
  return account;
}
function audit(config, targetId, command, reason, now, success, eventId = randomUUID()) {
  return { eventId, actorType: 'operator', operatorId: config.alias, actorId: null,
    workSessionId: null, poiId: null, targetAccountId: targetId, reason,
    action: { 'bootstrap-manager': 'manager.bootstrap', 'recover-manager': 'manager.recovery_code_issue', 'unlock-manager': 'manager.unlock' }[command],
    occurredAt: new Date(now), receivedAt: new Date(now),
    result: { status: success ? 'succeeded' : 'failed', errorCode: success ? null : 'OPERATOR_OPERATION_FAILED' } };
}
function bump(account) {
  if (!Number.isSafeInteger(account.authVersion + 1)) throw refused();
  account.authVersion++;
}
export async function applyOperator(runtime, config, command, target, passwordHash) {
  let knownTarget = null;
  try {
    const raw = command === 'recover-manager' ? randomBytes(32) : null;
    return await sessionTransaction(runtime.models.StaffAccount.db, async transaction => {
      let account = await preflight(runtime, command, target, transaction);
      const now = runtime.now();
      if (command === 'bootstrap-manager') {
        [account] = await runtime.models.StaffAccount.create([{ fullName: target.fullName, email: target.email,
          passwordHash, role: 'Manager', status: 'active', authVersion: 0 }], { session: transaction });
        await runtime.models.AuditLog.create([audit(config, account._id, command, target.reason, now, true, bootstrapEventId)], { session: transaction });
        return { accountId: String(account._id), status: 'active' };
      }
      knownTarget = account._id;
      bump(account);
      if (command === 'unlock-manager') account.status = 'active';
      await account.save({ session: transaction });
      let recovery;
      if (command === 'recover-manager') {
        await runtime.models.RecoveryCode.updateMany({ staffId: account._id, usedAt: null }, { $min: { expiresAt: new Date(now) } }, { session: transaction });
        const expiresAt = new Date(now + 900000);
        await runtime.models.RecoveryCode.create([{ staffId: account._id, codeHash: createHash('sha256').update(raw).digest('hex'),
          issuedBy: null, issuedByOperator: config.alias, usedAt: null, expiresAt }], { session: transaction });
        recovery = { code: raw.toString('base64url'), expiresAt: expiresAt.toISOString() };
      }
      await runtime.models.AuditLog.create([audit(config, account._id, command, target.reason, now, true)], { session: transaction });
      return { accountId: String(account._id), status: account.status, ...recovery };
    });
  } catch (error) {
    knownTarget ??= error?.verifiedTarget;
    let failureAudit = 'not_applicable';
    if (knownTarget && !error?.hasErrorLabel?.('UnknownTransactionCommitResult')) {
      try { await runtime.models.AuditLog.create(audit(config, knownTarget, command, target.reason, runtime.now(), false)); failureAudit = 'recorded'; }
      catch { failureAudit = 'unconfirmed'; }
    } else if (error?.hasErrorLabel?.('UnknownTransactionCommitResult')) failureAudit = 'unconfirmed';
    const safe = error instanceof OperatorError ? error : new OperatorError('OPERATOR_OPERATION_FAILED', 'Operator operation did not return a confirmed success');
    safe.failureAudit = failureAudit;
    throw safe;
  }
}

/** Injection supports tests only; CLI never exposes a prompt/connection bypass flag. */
export async function runOperator(args, { environment = process.env, prompt, output, connect = connectOperator } = {}) {
  const options = parseOperatorArguments(args);
  if (options.help) { output('Commands: bootstrap-manager | recover-manager | unlock-manager [--apply]. Default: authenticated dry-run.'); return; }
  const config = loadOperatorConfig(environment);
  authenticateOperator(config, await prompt('Operator key: ', true));
  const input = { email: await prompt('Verified target email: '), reason: await prompt('Verification/incident reason: ') };
  if (options.command === 'bootstrap-manager') input.fullName = await prompt('Verified full name: ');
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success || options.command === 'bootstrap-manager' && !parsed.data.fullName) throw invalid();
  const target = parsed.data;
  const runtime = await connect(config);
  try {
    try { await preflight(runtime, options.command, target); }
    catch (error) {
      if (options.apply && error?.verifiedTarget) {
        try { await runtime.models.AuditLog.create(audit(config, error.verifiedTarget, options.command, target.reason, runtime.now(), false)); error.failureAudit = 'recorded'; }
        catch { error.failureAudit = 'unconfirmed'; }
      }
      throw error;
    }
    output(JSON.stringify({ command: options.command, mode: config.mode, operator: config.alias,
      target: target.email, reason: target.reason, apply: options.apply }));
    if (!options.apply) return;
    if (await prompt('Type the exact target email to apply: ') !== target.email) throw refused();
    let passwordHash;
    if (options.command === 'bootstrap-manager') {
      const passwords = passwordSchema.safeParse({ password: await prompt('Password: ', true), confirmPassword: await prompt('Confirm password: ', true) });
      if (!passwords.success) throw invalid();
      passwordHash = await bcrypt.hash(passwords.data.password, 12);
    }
    const result = await applyOperator(runtime, config, options.command, target, passwordHash);
    // Recovery code is intentionally shown once ONLY by the interactive terminal output sink.
    output(JSON.stringify(result));
  } finally { await runtime.close(); }
}
