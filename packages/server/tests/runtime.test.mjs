import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { read_port } from '../src/runtime.mjs';

test('invalid ports fail before opening a socket', () => {
  for (const value of ['', '0', '65536', '12.5', 'bad']) {
    assert.throws(() => read_port(value, 4000, 'GATEWAY_PORT'), /GATEWAY_PORT/);
  }
  assert.equal(read_port(undefined, 4000), 4000);
  assert.equal(read_port('8080', 4000), 8080);
});

test(
  'SIGTERM drains HTTP and closes resources before exiting',
  { skip: process.platform === 'win32' },
  async () => {
    const runtime = new URL('../src/runtime.mjs', import.meta.url).href;
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import http from 'node:http';
    import { start_server } from ${JSON.stringify(runtime)};
    start_server({ app: http.createServer((_q,r)=>r.end('ok')), port:0, name:'fixture',
      onClose: async()=>{ await new Promise(r=>setTimeout(r,20)); console.log('CLOSED'); } });
  `,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let output = '';
    const exited = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code) => resolve(code));
    });
    await new Promise((resolve) =>
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (output.includes('listening')) resolve();
      }),
    );
    child.kill('SIGTERM');
    assert.equal(await exited, 0);
    assert.match(output, /CLOSED/);
  },
);
