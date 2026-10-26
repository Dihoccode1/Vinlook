import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHealthSampler, HealthSampleFailure } from '../src/health-sampler.js';
const epoch = Date.parse('2026-10-26T00:00:00.000Z');
const component = (snapshot, name) => snapshot.components.find(row => row.name === name);

test('constructor is idle; missing bridges remain unknown; snapshots are defensive and restart forgets samples', async () => {
  let calls = 0;
  const sampler = createHealthSampler({ now: () => epoch, probes: { usage: async () => { calls++; return true; } } });
  assert.equal(calls, 0); assert.equal(component(sampler.snapshot(), 'usage').status, 'unknown');
  assert.equal(component(sampler.snapshot(), 'worker').errorCode, 'BRIDGE_PENDING');
  const copy = sampler.snapshot(); copy.components[0].status = 'up'; assert.equal(sampler.snapshot().components[0].status, 'unknown');
  assert.equal(component(await sampler.sample(), 'usage').status, 'up'); assert.equal(calls, 1);
  const restart = createHealthSampler({ now: () => epoch }); assert.ok(restart.snapshot().components.every(row => row.status === 'unknown'));
  sampler.close(); restart.close();
});

test('configured probes start in parallel, share one in-flight refresh and cannot poll inside 30s', async () => {
  let time = epoch; const entered = [], releases = [];
  const probes = Object.fromEntries(['identity', 'content', 'usage'].map(name => [name, async ({ signal }) => {
    entered.push(name); assert.equal(signal.aborted, false);
    return new Promise(resolve => releases.push(resolve));
  }]));
  const sampler = createHealthSampler({ probes, now: () => time });
  const first = sampler.sample(); assert.equal(sampler.sample(), first);
  await Promise.resolve(); assert.equal(entered.length, 3); releases.forEach(resolve => resolve(true));
  assert.equal((await first).components.filter(row => row.status === 'up').length, 3);
  time += 29999; await sampler.sample(); assert.equal(entered.length, 3);
  time++; assert.equal(component(sampler.snapshot(), 'usage').status, 'stale');
  const next = sampler.sample(); await Promise.resolve(); assert.equal(entered.length, 6);
  releases.slice(3).forEach(resolve => resolve(true)); await next; sampler.close();
});

test('failed sampling preserves last success and never leaks a raw upstream error or marks unknown jobs healthy', async () => {
  let time = epoch, works = true;
  const sampler = createHealthSampler({ now: () => time, probes: { content: async () => {
    if (!works) throw Error('synthetic-private-token-and-database-uri'); return true;
  } } });
  await sampler.sample(); time += 30000; works = false;
  const snapshot = await sampler.sample(), content = component(snapshot, 'content');
  assert.equal(content.status, 'unavailable'); assert.equal(content.lastSuccessAt, epoch);
  assert.equal(content.checkedAt, time); assert.equal(content.errorCode, 'DEPENDENCY_UNAVAILABLE');
  assert.ok(!JSON.stringify(snapshot).includes('synthetic-private'));
  assert.equal(component(snapshot, 'worker').status, 'unknown'); assert.equal(snapshot.counts, undefined);
  time += 30000; assert.equal(component(sampler.snapshot(), 'content').status, 'stale'); sampler.close();
});

test('timeout aborts a stalled dependency at 3s without retry or blocking a successful peer', async () => {
  let signal, calls = 0;
  const sampler = createHealthSampler({ now: () => epoch, probes: {
    identity: ({ signal: input }) => { signal = input; calls++; return new Promise(() => {}); }, usage: async () => true,
  } });
  const result = await sampler.sample();
  assert.equal(component(result, 'identity').status, 'unavailable');
  assert.equal(component(result, 'identity').errorCode, 'SAMPLE_TIMEOUT'); assert.equal(signal.aborted, true);
  assert.equal(component(result, 'usage').status, 'up'); assert.equal(calls, 1); sampler.close();
});

test('worker freshness uses actual heartbeat: exact 180s is stale even with a fresh probe', async () => {
  let time = epoch, observedAt = epoch - 179999;
  const sampler = createHealthSampler({ now: () => time, probes: { worker: async () => ({ healthy: true, observedAt }) } });
  assert.equal(component(await sampler.sample(), 'worker').status, 'up');
  time++; assert.equal(component(sampler.snapshot(), 'worker').status, 'stale');
  time += 30000; assert.equal(component(await sampler.sample(), 'worker').status, 'stale');
  time += 30000; observedAt = time + 1;
  assert.equal(component(await sampler.sample(), 'worker').status, 'unavailable'); sampler.close();
});

test('malformed worker evidence and throwing response accessors cannot leak raw errors', async () => {
  for (const result of [true, { healthy: true, observedAt: epoch, token: 'synthetic-private' },
    { get healthy() { throw Error('synthetic-private-response'); }, observedAt: epoch }]) {
    const sampler = createHealthSampler({ now: () => epoch, probes: { worker: async () => result } });
    const snapshot = await sampler.sample(); assert.equal(component(snapshot, 'worker').status, 'unavailable');
    assert.ok(!JSON.stringify(snapshot).includes('synthetic-private')); sampler.close();
  }
});

test('close aborts probes immediately, prevents another refresh and cannot be changed by late completion', async () => {
  let signal, resolve;
  const sampler = createHealthSampler({ now: () => epoch, probes: { usage: ({ signal: input }) => {
    signal = input; return new Promise(done => { resolve = done; });
  } } });
  const pending = sampler.sample(); await Promise.resolve(); sampler.close();
  await assert.rejects(pending, { code: 'HEALTH_SAMPLER_CLOSED' }); assert.equal(signal.aborted, true);
  resolve(true); await assert.rejects(sampler.sample(), { code: 'HEALTH_SAMPLER_CLOSED' });
  assert.throws(() => sampler.snapshot(), { code: 'HEALTH_SAMPLER_CLOSED' });
});

test('clock regression and malformed dependency configuration fail safely', async () => {
  assert.throws(() => createHealthSampler({ probes: { invented: async () => true } }), /INVALID_HEALTH_DEPENDENCIES/);
  assert.throws(() => createHealthSampler({ probes: { usage: true } }), /INVALID_HEALTH_DEPENDENCIES/);
  let time = epoch; const sampler = createHealthSampler({ now: () => time }); await sampler.sample(); time--;
  assert.throws(() => sampler.snapshot(), error => error instanceof HealthSampleFailure && error.code === 'HEALTH_UNAVAILABLE');
  sampler.close();
  const invalid = createHealthSampler({ now: () => { throw Error('synthetic-private-clock'); } });
  assert.throws(() => invalid.snapshot(), { message: 'HEALTH_UNAVAILABLE' }); invalid.close();
});
