import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createGeminiTts } from '../../src/providers/gemini-tts.js';
import { createNarrationService } from '../../src/modules/translations/narration.service.js';
import { createApp } from '../../src/app.js';

const wav = Buffer.alloc(48); wav.write('RIFF'); wav.writeUInt32LE(40, 4); wav.write('WAVE', 8);
test('saved audio remains available while two other audio files are being generated', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const service = createNarrationService({ get: async () => ({ data: { name: 'POI', description: 'Story' } }) }, {
    identity: 'test', generate: async () => { await gate; return wav; },
  }, { find: async id => id === 'saved' ? wav : undefined, save: async () => {} });
  const first = service.get('first', 'vi'); const second = service.get('second', 'vi');
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(await service.get('saved', 'vi'), wav);
    await assert.rejects(service.get('third', 'vi'), { code: 'PROVIDER_BUSY' });
  } finally { release(); await Promise.all([first, second]); }
});
test('Gemini sends transcript with key only in header and accepts WAV audio', async () => {
  const provider = createGeminiTts('test-key', async (url, init) => {
    assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-key');
    const body = JSON.parse(String(init?.body)); assert.equal(body.input[0].content[0].text, 'Câu chuyện');
    assert.equal(body.response_format.mime_type, 'audio/wav');
    return Response.json({ steps: [{ type: 'model_output', content: [{ type: 'audio', data: wav.toString('base64') }] }] });
  });
  assert.deepEqual(await provider.generate('Câu chuyện'), wav);
});
test('Gemini rejects missing key, quota, non-audio output and timeout', async () => {
  await assert.rejects(createGeminiTts('').generate('x'), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(createGeminiTts('key', async () => new Response('', { status: 429 })).generate('x'), { code: 'PROVIDER_QUOTA' });
  await assert.rejects(createGeminiTts('key', async () => Response.json({ steps: [] })).generate('x'), { code: 'PROVIDER_UNAVAILABLE' });
  await assert.rejects(createGeminiTts('key', async () => { throw new DOMException('timeout', 'TimeoutError'); }).generate('x'), { code: 'PROVIDER_TIMEOUT' });
});
test('narration shares generation, caches audio and invalidates on source changes', async () => {
  const data = { name: 'POI', description: 'Câu chuyện' }; let calls = 0;
  const service = createNarrationService({ get: async () => ({ data }) }, { identity: 'test:voice', generate: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return wav; } });
  await Promise.all([service.get('poi', 'vi'), service.get('poi', 'vi')]); assert.equal(calls, 1);
  await service.get('poi', 'vi'); assert.equal(calls, 1);
  data.description = 'Mới'; await service.get('poi', 'vi'); assert.equal(calls, 2);
});
test('narration HTTP returns binary WAV and validates ID, language and arbitrary text', async () => {
  const app = createApp(undefined, { get: async () => wav });
  const url = '/pois/11111111-1111-4111-8111-111111111111/narration';
  const response = await request(app).post(url).send({ language: 'vi' }).expect(200);
  assert.match(response.headers['content-type'], /^audio\/wav/); assert.deepEqual(response.body, wav);
  await request(app).post(url).send({ language: 'xx' }).expect(400);
  await request(app).post(url).send({ language: 'vi', text: 'arbitrary' }).expect(400);
  await request(app).post('/pois/invalid/narration').send({ language: 'vi' }).expect(400);
});
test('persistent audio survives new service instance; changed text regenerates it', async () => {
  const rows = new Map<string, { hash: string; audio: Buffer }>(); let calls = 0;
  const data = { name: 'POI', description: 'Bài gốc' };
  const repository = {
    find: async (id: string, language: string, hash: string) => { const row = rows.get(`${id}:${language}`); return row?.hash === hash ? row.audio : undefined; },
    save: async (id: string, language: string, hash: string, audio: Buffer) => { rows.set(`${id}:${language}`, { hash, audio }); },
  };
  const provider = { identity: 'voice', generate: async () => { calls++; return wav; } };
  const make = () => createNarrationService({ get: async () => ({ data }) }, provider, repository);
  await make().get('poi', 'vi'); await make().get('poi', 'vi'); assert.equal(calls, 1);
  data.description = 'Đã sửa'; await make().get('poi', 'vi'); assert.equal(calls, 2);
  assert.equal(rows.size, 1);
});
