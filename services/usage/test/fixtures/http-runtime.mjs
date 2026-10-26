// TEST ONLY: loopback Identity/Content and explicit memory or disposable-Mongo Usage dependencies.
import { createServer } from 'node:http';
import { once, EventEmitter } from 'node:events';
import { createApp } from '../../src/app.js';
import { createUsageService } from '../../src/domain.js';
import { createHealthSampler } from '../../src/health-sampler.js';
import { createPublicContentVerifier, createReadinessProbe } from '../../src/public-content.js';
import { assembleUsageRuntime } from '../../src/business-runtime.js';
import { languageCodes } from '../../src/policy.js';
import { createTransactionFixture } from './transaction-store.mjs';
import { FIXTURE_IDS as ids, FIXTURE_EPOCH } from './poc-usage.mjs';
export { ids };
const requestId = '00000000-0000-4000-8000-000000000099';
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const body = async req => { let value = ''; for await (const chunk of req) value += chunk; return JSON.parse(value); };
export async function httpFixture(t, { fixtureMode, connection = null } = {}) {
  if (fixtureMode !== true) throw Error('EXPLICIT_HTTP_FIXTURE_REQUIRED');
  let time = FIXTURE_EPOCH; const events = new EventEmitter(), calls = { identity: [], content: [] }, delayed = [];
  const modes = { authority: 'Staff', content: 'valid', down: false };
  const servers = [];
  async function listen(handler) {
    const server = createServer(handler); servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  const identityOrigin = await listen(async (req, res) => {
    calls.identity.push({ path: req.url, headers: req.headers });
    if (req.url === '/health/ready') return json(res, 200, { data: { status: 'ready' }, requestId });
    await body(req);
    if (modes.authority === 'locked') return json(res, 403, { error: { code: 'ACCESS_DENIED', message: 'Access is denied', requestId } });
    if (modes.authority === 'down') return json(res, 503, { error: { code: 'private', message: 'synthetic-private-error', requestId } });
    return json(res, 200, { data: { account: { id: '000000000000000000000090', role: modes.authority, status: 'active', authVersion: 0 }, currentWorkSession: null }, requestId });
  });
  const contentOrigin = await listen((req, res) => {
    calls.content.push({ path: req.url, headers: req.headers });
    if (req.url === '/health/ready') return json(res, 200, { data: { status: 'ready' }, requestId });
    const url = new URL(req.url, 'http://fixture.invalid'), languageCode = url.searchParams.get('language'), id = url.pathname.split('/').at(-1);
    const respond = () => {
      if (modes.content === 'missing') return json(res, 404, { error: 'synthetic-private-error' });
      if (modes.content === 'redirect') { res.writeHead(302, { Location: identityOrigin + '/steal' }); res.end(); return; }
      if (modes.content === 'invalid') return json(res, 200, { data: { private: 'synthetic-private-error' }, requestId });
      if (modes.content === 'oversize') { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': String(8 * 1024 * 1024 + 1) }); res.flushHeaders(); return; }
      return json(res, 200, { data: { id: modes.content === 'wrong-id' ? ids.poiB : id, revisionId: '000000000000000000000080', nameEN: 'Synthetic public POI',
        location: { type: 'Point', coordinates: [106.7, 10.7] }, entrance: { type: 'Point', coordinates: [106.7, 10.7] },
        thumbnail: { url: 'https://assets.example.invalid/fixture.jpg' }, languageCode: modes.content === 'wrong-locale' ? 'vi' : languageCode, text: 'Synthetic narration, not tourist content.',
        audio: { url: 'https://assets.example.invalid/fixture.mp3', durationSeconds: 120 } }, requestId });
    };
    if (modes.content === 'delay') delayed.push(respond); else respond(); events.emit('content');
  });
  const config = { authorization: { baseUrl: identityOrigin, key: Buffer.alloc(32, 9).toString('base64url') },
    contentOrigin, origins: ['https://tourist.example.invalid'], mode: 'test' };
  const store = connection ? null : createTransactionFixture({ fixtureMode: true, failAt: () => modes.down });
  const runtime = connection ? assembleUsageRuntime({ connection, config, now: () => time }) : {
    authorization: config.authorization, origins: config.origins, now: () => time, ready: async () => !modes.down,
    service: createUsageService({ store, languageCodes, now: () => time, verifyPublicPoi: createPublicContentVerifier(contentOrigin) }),
    sampler: createHealthSampler({ now: () => time, probes: { identity: createReadinessProbe(identityOrigin), content: createReadinessProbe(contentOrigin), usage: async () => !modes.down } }),
  };
  const server = createApp({ runtime }).listen(0, '127.0.0.1'); servers.push(server); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    runtime.sampler.close(); delayed.splice(0).forEach(resolve => resolve());
    for (const item of servers) { const closed = new Promise(resolve => item.close(resolve)); item.closeAllConnections(); await closed; }
  });
  return { runtime, store, calls, modes, origin, config, advance(ms) { time += ms; },
    async waitForAdmission(count) { while (calls.content.filter(call => call.path.startsWith('/api/v1/pois/')).length < count) await once(events, 'content'); },
    release() { modes.content = 'valid'; delayed.splice(0).forEach(resolve => resolve()); },
    async request(path, { method = 'POST', value, raw, token, origin: requestOrigin = 'https://tourist.example.invalid', headers = {} } = {}) {
      const response = await fetch(`${origin}/api/v1${path}`, { method, headers: { ...(requestOrigin === undefined || requestOrigin === false ? {} : { Origin: requestOrigin }),
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        ...(method === 'POST' ? { body: raw ?? JSON.stringify(value ?? {}) } : {}) });
      const text = await response.text(); return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null };
    } };
}
