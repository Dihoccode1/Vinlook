import { spawn } from 'node:child_process';
import { ProviderFailure } from './provider.js';
export function validateWav(bytes) {
  const bad = () => {
    throw new ProviderFailure();
  };
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 44 ||
    bytes.length > 8388608 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE' ||
    bytes.readUInt32LE(4) !== bytes.length - 8
  )
    bad();
  let fmt = false,
    data = null,
    offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) bad();
    const name = bytes.toString('ascii', offset, offset + 4),
      size = bytes.readUInt32LE(offset + 4),
      start = offset + 8,
      end = start + size;
    if (end > bytes.length) bad();
    if (name === 'fmt ') {
      if (
        fmt ||
        size !== 16 ||
        bytes.readUInt16LE(start) !== 1 ||
        bytes.readUInt16LE(start + 2) !== 1 ||
        bytes.readUInt32LE(start + 4) !== 24000 ||
        bytes.readUInt32LE(start + 8) !== 48000 ||
        bytes.readUInt16LE(start + 12) !== 2 ||
        bytes.readUInt16LE(start + 14) !== 16
      )
        bad();
      fmt = true;
    }
    if (name === 'data') {
      if (data !== null || size % 2) bad();
      data = bytes.subarray(start, end);
    }
    offset = end + (size % 2);
  }
  if (
    offset !== bytes.length ||
    !fmt ||
    data === null ||
    data.length / 48000 < 90 ||
    data.length / 48000 > 150
  )
    bad();
  let nonzero = false;
  for (let i = 0; i < data.length; i += 2)
    if (data.readInt16LE(i) !== 0) {
      nonzero = true;
      break;
    }
  if (!nonzero) bad();
  return data.length / 48000;
}
export function childOutput(file, args, bytes, { signal, limit = 3145728, timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ProviderFailure());
    const child = spawn(file, args, {
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        LANG: 'C',
        ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}),
      },
    });
    let ended = false,
      size = 0,
      errSize = 0;
    const chunks = [];
    const finish = (error, value) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) child.kill('SIGKILL');
      error ? reject(new ProviderFailure()) : resolve(value);
    };
    const abort = () => finish(true),
      timer = setTimeout(abort, timeout);
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', abort);
    child.stdin.on('error', () => {});
    child.stdout.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) return abort();
      chunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      errSize += chunk.length;
      if (errSize > 65536) abort();
    });
    child.once('close', (code) => finish(code !== 0, Buffer.concat(chunks)));
    child.stdin.end(bytes);
  });
}
export async function verifyBinaries(config) {
  for (const file of [config.ffmpeg, config.ffprobe]) {
    const v = await childOutput(file, ['-version'], Buffer.alloc(0), { limit: 65536 });
    if (!/version 7\.1\.5-0\+deb13u1\b/.test(v.toString()))
      throw new ProviderFailure('PROVIDER_FAILED');
  }
  const enc = await childOutput(config.ffmpeg, ['-hide_banner', '-encoders'], Buffer.alloc(0), {
    limit: 65536,
  });
  if (!enc.toString().includes('libmp3lame')) throw new ProviderFailure('PROVIDER_FAILED');
}
export function createTranscoder(config) {
  return async (wav, { signal } = {}) => {
    validateWav(wav);
    const mp3 = await childOutput(
      config.ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-threads',
        '1',
        '-protocol_whitelist',
        'pipe',
        '-f',
        'wav',
        '-i',
        'pipe:0',
        '-map',
        '0:a:0',
        '-vn',
        '-ac',
        '1',
        '-ar',
        '24000',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        '-threads',
        '1',
        '-f',
        'mp3',
        'pipe:1',
      ],
      wav,
      { signal },
    );
    const raw = await childOutput(
      config.ffprobe,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'pipe',
        '-f',
        'mp3',
        '-i',
        'pipe:0',
        '-show_entries',
        'stream=codec_name,channels,sample_rate',
        '-of',
        'json',
      ],
      mp3,
      { signal, limit: 65536 },
    );
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ProviderFailure();
    }
    if (
      parsed.streams?.length !== 1 ||
      parsed.streams[0].codec_name !== 'mp3' ||
      parsed.streams[0].channels !== 1 ||
      parsed.streams[0].sample_rate !== '24000'
    )
      throw new ProviderFailure();
    return mp3;
  };
}
