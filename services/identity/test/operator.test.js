import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
import { createHash, randomBytes } from 'node:crypto';
import { loadOperatorConfig, authenticateOperator, parseOperatorArguments, runOperator } from '../src/operator.js';
import { ttyPrompt } from '../scripts/operator.js';

const raw = randomBytes(32).toString('base64url');
const environment = { NODE_ENV: 'test', IDENTITY_OPERATOR_MONGODB_URI: 'mongodb://127.0.0.1/vinlook_identity_task010',
  IDENTITY_OPERATOR_ALIAS: 'synthetic-operator', IDENTITY_OPERATOR_KEY_SHA256: createHash('sha256').update(Buffer.from(raw, 'base64url')).digest('hex') };

test('private operator config/arguments reject unsafe inputs without exposing them', () => {
  assert.deepEqual(parseOperatorArguments(['recover-manager']), { command: 'recover-manager', apply: false });
  for (const args of [[], ['--apply'], ['recover-manager', '--password=secret'], ['bootstrap-manager', '--apply', 'target']]) assert.throws(() => parseOperatorArguments(args));
  for (const patch of [{ NODE_ENV: 'invalid' }, { IDENTITY_OPERATOR_MONGODB_URI: 'mongodb://127.0.0.1/admin' },
    { IDENTITY_OPERATOR_ALIAS: 'bad\nalias' }, { IDENTITY_OPERATOR_KEY_SHA256: 'synthetic-secret' },
    { IDENTITY_OPERATOR_MONGODB_URI: undefined, IDENTITY_MONGODB_URI: environment.IDENTITY_OPERATOR_MONGODB_URI }]) {
    assert.throws(() => loadOperatorConfig({ ...environment, ...patch }), error => !error.message.includes('synthetic-secret'));
  }
  assert.throws(() => loadOperatorConfig({ ...environment, NODE_ENV: 'production' }));
  const config = loadOperatorConfig(environment); authenticateOperator(config, raw);
  for (const value of ['bad', `${raw}=`, randomBytes(32).toString('base64url')]) assert.throws(() => authenticateOperator(config, value));
});

test('help and wrong key never connect; secret prompt is explicitly hidden', async () => {
  let connections = 0;
  const connect = async () => { connections++; throw new Error('Unexpected DB connection'); };
  const output = [];
  await runOperator(['--help'], { environment: {}, output: line => output.push(line), connect });
  await assert.rejects(runOperator(['recover-manager'], { environment, connect, output: () => {}, prompt: async (_label, secret) => {
    assert.equal(secret, true); return 'bad';
  } }));
  assert.equal(connections, 0); assert.equal(output.join('').includes(raw), false);
});

test('secret TTY stream does not echo, handles Unicode/backspace/cancel and restores raw state', async () => {
  const input = new PassThrough(); input.isTTY = true; input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  const output = new PassThrough(); output.isTTY = true;
  let printed = ''; output.on('data', data => { printed += data.toString(); });
  input.pause();
  const pending = ttyPrompt('Hidden: ', true, input, output);
  input.emit('keypress', 'secret😀', {}); input.emit('keypress', undefined, { name: 'backspace' });
  input.emit('keypress', undefined, { name: 'return' });
  assert.equal(await pending, 'secret'); assert.equal(printed.includes('secret'), false); assert.equal(input.isRaw, false); assert.equal(input.isPaused(), true);
  const cancelled = ttyPrompt('Hidden: ', true, input, output);
  input.emit('keypress', undefined, { ctrl: true, name: 'c' });
  await assert.rejects(cancelled, error => error.code === 'OPERATOR_CANCELLED');
  assert.equal(input.isRaw, false);
  await assert.rejects(ttyPrompt('Hidden: ', true, new PassThrough(), output), error => error.code === 'OPERATOR_TTY_REQUIRED');
});

test('actual CLI help is no-config/no-DB and redirected secret input fails closed without disclosure', () => {
  const script = fileURLToPath(new URL('../scripts/operator.js', import.meta.url));
  const help = spawnSync(process.execPath, [script, '--help'], { env: {}, encoding: 'utf8', timeout: 10000 });
  assert.ifError(help.error); assert.equal(help.status, 0); assert.match(help.stdout, /Default: authenticated dry-run/);
  const child = spawnSync(process.execPath, [script, 'recover-manager'], { env: { ...process.env, ...environment }, input: raw,
    encoding: 'utf8', timeout: 10000 });
  assert.ifError(child.error); assert.equal(child.status, 1); assert.match(child.stderr, /OPERATOR_TTY_REQUIRED/);
  assert.equal((child.stdout + child.stderr).includes(raw), false); assert.equal((child.stdout + child.stderr).includes(environment.IDENTITY_OPERATOR_MONGODB_URI), false);
});
