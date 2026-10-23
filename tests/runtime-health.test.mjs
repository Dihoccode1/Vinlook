import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const sentinel = 'synthetic-sensitive-value-for-redaction';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

for (const [service, defaultPort] of [['identity', 3001], ['content', 3002], ['usage', 3003]]) {
  const { loadConfig, ConfigurationError } = await import(`../services/${service}/src/config.js`);
  const { createApp } = await import(`../services/${service}/src/app.js`);

  test(`${service}: isolated defaults and valid production config`, () => {
    const input = { JWT_SECRET: sentinel, MONGODB_URI: sentinel, GEMINI_API_KEY: sentinel };
    const config = loadConfig(input);
    assert.deepEqual(config, { mode: 'development', host: '127.0.0.1', port: defaultPort });
    assert.equal(Object.isFrozen(config), true);
    assert.deepEqual(Object.keys(config).sort(), ['host', 'mode', 'port']);
    assert.deepEqual(input, { JWT_SECRET: sentinel, MONGODB_URI: sentinel, GEMINI_API_KEY: sentinel });
    assert.deepEqual(loadConfig({ NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '10000' }),
      { mode: 'production', host: '0.0.0.0', port: 10000 });
    assert.equal(loadConfig({ NODE_ENV: 'test', PORT: '65535' }).port, 65535);
    assert.equal(loadConfig({ PORT: '1' }).port, 1);
  });

  test(`${service}: invalid runtime values reject without exposing inputs`, () => {
    const cases = [
      [{ NODE_ENV: sentinel }, 'NODE_ENV'],
      [{ HOST: '   ' }, 'HOST'],
      [{ NODE_ENV: 'production' }, 'HOST'],
      [{ NODE_ENV: 'production', HOST: '0.0.0.0' }, 'PORT'],
      [{ NODE_ENV: 'production', HOST: sentinel, PORT: '10000' }, 'HOST'],
      ...['', '0', '65536', '-1', '3.1', '3001abc', 'NaN', '1e3', ' 3001', sentinel].map(PORT => [{ PORT }, 'PORT']),
    ];
    for (const [environment, field] of cases) {
      assert.throws(() => loadConfig(environment), error => {
        assert.ok(error instanceof ConfigurationError);
        assert.equal(error.code, 'INVALID_RUNTIME_CONFIG');
        assert.ok(error.fields.includes(field));
        assert.equal(JSON.stringify(error).includes(sentinel), false);
        assert.equal(error.message.includes(sentinel), false);
        return true;
      });
    }
  });

  test(`${service}: invalid production entrypoint exits before listening`, () => {
    const child = spawnSync(process.execPath, [resolve(root, `services/${service}/src/server.js`)], {
      cwd: root, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, NODE_ENV: 'production', HOST: sentinel, PORT: '10000', JWT_SECRET: sentinel },
    });
    assert.ifError(child.error);
    assert.equal(child.status, 1);
    assert.equal(child.stdout.includes('listening'), false);
    assert.equal(child.stderr.trim(), 'Invalid runtime configuration: HOST');
    assert.equal((child.stdout + child.stderr).includes(sentinel), false);
  });

  test(`${service}: native env-file loads and shell values take precedence`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'vinlook-runtime-'));
    const file = join(directory, '.env');
    writeFileSync(file, `NODE_ENV=test\nHOST=127.0.0.1\nPORT=3456\nUNUSED_SECRET=${sentinel}\n`);
    const environment = { ...process.env };
    for (const name of ['NODE_ENV', 'HOST', 'PORT']) delete environment[name];
    const configUrl = pathToFileURL(resolve(root, `services/${service}/src/config.js`)).href;
    const probe = `import { loadConfig } from ${JSON.stringify(configUrl)}; console.log(JSON.stringify(loadConfig()));`;
    try {
      for (const override of [false, true]) {
        const child = spawnSync(process.execPath, [`--env-file-if-exists=${file}`, '--input-type=module', '-e', probe], {
          encoding: 'utf8', timeout: 10000,
          env: override ? { ...environment, PORT: '5678' } : environment,
        });
        assert.ifError(child.error);
        assert.equal(child.status, 0);
        assert.deepEqual(JSON.parse(child.stdout), { mode: 'test', host: '127.0.0.1', port: override ? 5678 : 3456 });
        assert.equal((child.stdout + child.stderr).includes(sentinel), false);
      }
    } finally {
      unlinkSync(file);
      rmdirSync(directory);
    }
  });

  test(`${service}: truthful health, no caching/reflection, protected routes stay absent`, async () => {
    const server = createApp().listen(0, '127.0.0.1');
    try {
      await once(server, 'listening');
      const base = `http://127.0.0.1:${server.address().port}`;
      const live = await fetch(`${base}/health/live`, { headers: { 'x-request-id': sentinel }, signal: AbortSignal.timeout(5000) });
      const liveBody = await live.json();
      assert.equal(live.status, 200);
      assert.equal(live.headers.get('cache-control'), 'no-store');
      assert.equal(live.headers.get('x-powered-by'), null);
      assert.deepEqual(liveBody.data, { status: 'up' });
      assert.match(liveBody.requestId, uuid);
      assert.deepEqual(Object.keys(liveBody).sort(), ['data', 'requestId']);
      const ready = await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(5000) });
      const readyBody = await ready.json();
      assert.equal(ready.status, 503);
      assert.equal(ready.headers.get('cache-control'), 'no-store');
      assert.equal(readyBody.error.code, 'DEPENDENCIES_UNVERIFIED');
      assert.equal(readyBody.error.message, 'Service dependencies are not verified');
      assert.match(readyBody.error.requestId, uuid);
      assert.notEqual(liveBody.requestId, readyBody.error.requestId);
      assert.equal(JSON.stringify({ liveBody, readyBody }).includes(sentinel), false);
      for (const path of ['/monitoring/health', '/monitoring/jobs', '/pois', '/auth/login']) {
        const response = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
        assert.equal(response.status, 404);
        await response.arrayBuffer();
      }
    } finally {
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
  });
}
