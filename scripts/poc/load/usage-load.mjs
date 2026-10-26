#!/usr/bin/env node
// Bounded Usage/Content visitor load runner for #75. Runs only against an origin the operator
// repeats in --confirm-target; never starts on its own, never retries, never stores GPS/IP/tokens.
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const CAPS = Object.freeze({ visitors: 50, durationSeconds: 600, rampSeconds: 300, timeoutMs: 15000 });
const HEARTBEAT_MS = 30000, MONITOR_MS = 30000;
const usage = `Usage: node scripts/poc/load/usage-load.mjs --usage <origin> --content <origin> --confirm-target <usage origin>
  --poi <24-hex poiId> --language <code> [--visitors 10] [--listen-ratio 0.5] [--duration 120] [--ramp 30]
Origins must be https://, or http://127.0.0.1 / http://localhost for disposable local runs.
Optional env VINLOOK_LOAD_STAFF_TOKEN polls GET /monitoring/summary every 30s (Staff/Manager Bearer, never printed).`;

function fail(message) { console.error(`${message}\n\n${usage}`); process.exit(2); }
function origin(value, name) {
  let url; try { url = new URL(value); } catch { fail(`${name} is not a URL`); }
  const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if (!(url.protocol === 'https:' || local) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) fail(`${name} must be a bare https origin or local http origin`);
  return url.origin;
}
function bounded(value, name, min, max, integer = true) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || integer && !Number.isInteger(number)) fail(`${name} must be within ${min}..${max}`);
  return number;
}

const { values } = parseArgs({ options: { usage: { type: 'string' }, content: { type: 'string' }, 'confirm-target': { type: 'string' },
  poi: { type: 'string' }, language: { type: 'string' }, visitors: { type: 'string', default: '10' }, 'listen-ratio': { type: 'string', default: '0.5' },
  duration: { type: 'string', default: '120' }, ramp: { type: 'string', default: '30' }, help: { type: 'boolean' } }, strict: true });
if (values.help) { console.log(usage); process.exit(0); }
const usageOrigin = origin(values.usage, '--usage'), contentOrigin = origin(values.content, '--content');
if (values['confirm-target'] !== usageOrigin) fail('--confirm-target must repeat the exact --usage origin');
if (!/^[a-f0-9]{24}$/.test(values.poi ?? '')) fail('--poi must be a lowercase ObjectId of a published POI');
if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,4})?$/.test(values.language ?? '')) fail('--language must be a registry locale code');
const config = { visitors: bounded(values.visitors, '--visitors', 1, CAPS.visitors), listenRatio: bounded(values['listen-ratio'], '--listen-ratio', 0, 1, false),
  durationMs: bounded(values.duration, '--duration', 10, CAPS.durationSeconds) * 1000, rampMs: bounded(values.ramp, '--ramp', 0, CAPS.rampSeconds) * 1000 };
const staffToken = process.env.VINLOOK_LOAD_STAFF_TOKEN || null;

const samples = new Map(), statuses = new Map(), started = performance.now();
let firstSuccessMs = null, stopping = false;
const record = (name, ms, status) => {
  if (!samples.has(name)) samples.set(name, []);
  samples.get(name).push(ms);
  const key = `${name} ${status}`; statuses.set(key, (statuses.get(key) ?? 0) + 1);
  if (status >= 200 && status < 300 && firstSuccessMs === null) firstSuccessMs = Math.round(performance.now() - started);
};
async function call(name, method, url, body, headers = {}) {
  const begin = performance.now();
  try {
    const response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(CAPS.timeoutMs),
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    record(name, performance.now() - begin, response.status);
    return { status: response.status, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  } catch (error) {
    record(name, performance.now() - begin, error?.name === 'TimeoutError' ? 'timeout' : 'network');
    return { status: 0, json: null };
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const api = path => `${usageOrigin}/api/v1${path}`;

async function visitor(index) {
  await sleep(config.visitors > 1 ? Math.round(config.rampMs * index / (config.visitors - 1)) : 0);
  const browserId = randomUUID(), listens = index < Math.round(config.visitors * config.listenRatio);
  await call('content.poiDetail', 'GET', `${contentOrigin}/api/v1/pois/${values.poi}?language=${encodeURIComponent(values.language)}`);
  await call('presence.heartbeat', 'POST', api('/presence/heartbeat'), { browserId });
  let playbackId = null;
  if (listens) {
    playbackId = randomUUID();
    const start = await call('listening.start', 'POST', api('/listening/start'), { browserId, playbackId, poiId: values.poi, languageCode: values.language });
    if (start.status !== 200) playbackId = null;
  }
  // Jitter spreads heartbeats so the run does not synchronize into bursts.
  await sleep(Math.floor(Math.random() * HEARTBEAT_MS));
  while (!stopping) {
    await call('presence.heartbeat', 'POST', api('/presence/heartbeat'), { browserId });
    if (playbackId) await call('listening.heartbeat', 'POST', api(`/listening/${playbackId}/heartbeat`), { browserId });
    await sleep(HEARTBEAT_MS);
  }
  if (playbackId) await call('listening.end', 'POST', api(`/listening/${playbackId}/end`), { browserId, reason: 'closed' });
}

const monitorReadings = [];
async function monitor() {
  while (!stopping && staffToken) {
    const result = await call('monitoring.summary', 'GET', api('/monitoring/summary'), null, { authorization: `Bearer ${staffToken}` });
    const data = result.json?.data;
    monitorReadings.push(result.status === 200 && data ? { atMs: Math.round(performance.now() - started), onlineVisitors: data.onlineVisitors, currentListeners: data.currentListeners }
      : { atMs: Math.round(performance.now() - started), status: result.status });
    await sleep(MONITOR_MS);
  }
}

function percentile(sorted, p) { return sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)]) : null; }
console.error(`Load: ${config.visitors} visitors (${Math.round(config.visitors * config.listenRatio)} listening) for ${config.durationMs / 1000}s against ${usageOrigin}`);
const workers = Array.from({ length: config.visitors }, (_, index) => visitor(index));
const monitoring = monitor();
await sleep(config.durationMs); stopping = true;
await Promise.all([...workers, monitoring]);

const endpoints = Object.fromEntries([...samples].sort(([a], [b]) => a.localeCompare(b)).map(([name, list]) => {
  const sorted = [...list].sort((a, b) => a - b);
  return [name, { requests: sorted.length, p50Ms: percentile(sorted, 50), p95Ms: percentile(sorted, 95), maxMs: Math.round(sorted.at(-1)) }];
}));
console.log(JSON.stringify({ scope: 'online-poc-v1', target: { usage: usageOrigin, content: contentOrigin }, config: { ...config, poi: values.poi, language: values.language },
  startedAt: new Date(Date.now() - (performance.now() - started)).toISOString(), firstSuccessMs, endpoints,
  statuses: Object.fromEntries([...statuses].sort()), expectedMonitor: { onlineVisitors: config.visitors, currentListeners: Math.round(config.visitors * config.listenRatio) },
  monitorReadings, note: 'Measurement only; acceptance requires Duy review of target, timing, warm/cold state and device context.' }, null, 2));
