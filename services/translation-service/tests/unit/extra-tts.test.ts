import test from 'node:test';
import assert from 'node:assert/strict';
import { create_azure_tts } from '../../src/providers/azure-tts.js';
import { create_google_cloud_tts } from '../../src/providers/google-cloud-tts.js';
import { create_tts_pool } from '../../src/providers/tts-provider.js';
import { TranslationError } from '../../src/modules/translations/types.js';
import { create_narration_service } from '../../src/modules/translations/narration.service.js';
import { narration_key } from '../../src/modules/translations/narration-key.js';

const wav = Buffer.alloc(48); wav.write('RIFF'); wav.write('WAVE', 8);
test('Azure uses locale-specific neural voices, header auth and escaped SSML', async () => {
  for (const [language, voice] of [['vi', 'vi-VN-HoaiMyNeural'], ['en', 'en-US-JennyNeural'], ['zh-CN', 'zh-CN-XiaoxiaoNeural']]) {
    const provider = create_azure_tts('azure-key', 'southeastasia', async (url, init) => {
      assert.equal(String(url), 'https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1');
      assert.equal(new Headers(init?.headers).get('Ocp-Apim-Subscription-Key'), 'azure-key');
      assert.equal(new Headers(init?.headers).get('X-Microsoft-OutputFormat'), 'riff-24khz-16bit-mono-pcm');
      assert.ok(String(init?.body).includes(String(voice))); assert.ok(String(init?.body).includes('A &amp; &lt;break/&gt;'));
      assert.ok(!String(init?.body).includes('<break/>'));
      return new Response(wav);
    });
    assert.deepEqual(await provider.generate('A & <break/>', language), wav);
  }
});
test('Google uses Standard voices and decodes LINEAR16 with its WAV header', async () => {
  for (const [language, code] of [['vi', 'vi-VN'], ['en', 'en-US'], ['zh-CN', 'cmn-CN']]) {
    const provider = create_google_cloud_tts('google-key', async (url, init) => {
      assert.equal(String(url), 'https://texttospeech.googleapis.com/v1/text:synthesize');
      assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'google-key');
      const body = JSON.parse(String(init?.body)); assert.equal(body.input.text, 'Story'); assert.equal(body.voice.languageCode, code);
      assert.match(body.voice.name, /-Standard-/); assert.equal(body.audioConfig.audioEncoding, 'LINEAR16');
      return Response.json({ audioContent: wav.toString('base64') });
    });
    assert.deepEqual(await provider.generate('Story', language), wav);
  }
});
test('missing credentials, invalid region, quota and invalid audio fail without leaking keys', async () => {
  await assert.rejects(create_azure_tts('', 'eastus').generate('x'), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(create_azure_tts('key', 'evil.example/path').generate('x'), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(create_google_cloud_tts('').generate('x'), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(create_azure_tts('key', 'eastus', async () => new Response('', { status: 429 })).generate('x'), { code: 'PROVIDER_QUOTA' });
  await assert.rejects(create_google_cloud_tts('key', async () => Response.json({ audioContent: Buffer.from('invalid').toString('base64') })).generate('x'), { code: 'PROVIDER_UNAVAILABLE' });
  await assert.rejects(create_google_cloud_tts('key', async () => new Response('', { status: 403 })).generate('x'), { code: 'PROVIDER_NOT_CONFIGURED' });
});
test('TTS pool shares independent requests and falls back after quota', async () => {
  let running = 0; let peak = 0;
  const make = (identity: string) => ({ identity, generate: async (_text: string, language?: string) => {
    assert.equal(language, 'vi'); running++; peak = Math.max(peak, running); await new Promise(resolve => setTimeout(resolve, 5)); running--; return wav;
  } });
  const pool = create_tts_pool([make('gemini'), make('azure'), make('google')]);
  await Promise.all([pool.generate('one', 'vi'), pool.generate('two', 'vi')]); assert.equal(peak, 2);
  let attempts = 0;
  const failover = create_tts_pool([{ identity: 'gemini', generate: async () => { attempts++; throw new TranslationError('PROVIDER_QUOTA'); } }, make('azure')]);
  assert.deepEqual(await failover.generate('one', 'vi'), wav);
  await failover.generate('two', 'vi'); await failover.generate('three', 'vi'); assert.equal(attempts, 1);
});
test('new pool reuses existing Gemini audio without requesting any new synthesis', async () => {
  const data = { name: 'POI', description: 'Story' };
  const pool = create_tts_pool([{ identity: 'gemini-existing', generate: async () => { assert.fail('should reuse'); } }, { identity: 'azure', generate: async () => { assert.fail('should reuse'); } }]);
  const old_key = narration_key('poi', 'vi', data.name, data.description, 'gemini-existing');
  const saved: string[] = [];
  const service = create_narration_service({ get: async () => ({ data }) }, pool, {
    find: async (_id, _language, key) => key === old_key ? wav : undefined,
    save: async (_id, _language, key) => { saved.push(key); },
  });
  assert.deepEqual(await service.get('poi', 'vi'), wav);
  assert.equal(saved[0], narration_key('poi', 'vi', data.name, data.description, pool.identity));
});
