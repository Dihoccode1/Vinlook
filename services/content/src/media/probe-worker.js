// Isolated child process, no provider credentials or network operations.
import sharp from 'sharp';
import { parseBuffer } from 'music-metadata';
import { createHash } from 'node:crypto';
sharp.cache(false);
sharp.concurrency(1);
function mp3Frames(bytes) {
  let offset = 0,
    tags = 0,
    frames = 0,
    duration = 0,
    frameBytes = 0,
    rate = null,
    version = null;
  while (bytes.subarray(offset, offset + 3).toString() === 'ID3') {
    if (offset + 10 > bytes.length) throw Error('Invalid tag');
    const header = bytes.subarray(offset, offset + 10);
    if (![2, 3, 4].includes(header[3]) || [...header.subarray(6, 10)].some((v) => v & 128))
      throw Error('Invalid tag');
    const size = header[6] * 2097152 + header[7] * 16384 + header[8] * 128 + header[9];
    const length = 10 + size + (header[3] === 4 && header[5] & 16 ? 10 : 0);
    tags += length;
    if (tags > 262144 || offset + length > bytes.length) throw Error('Invalid tag');
    offset += length;
  }
  const tables = {
    one: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    other: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  };
  while (offset < bytes.length) {
    if (bytes.length - offset === 128 && bytes.subarray(offset, offset + 3).toString() === 'TAG') {
      tags += 128;
      offset += 128;
      break;
    }
    if (offset + 4 > bytes.length) throw Error('Truncated frame');
    const a = bytes[offset],
      b = bytes[offset + 1],
      c = bytes[offset + 2],
      d = bytes[offset + 3];
    const v = (b >> 3) & 3,
      layer = (b >> 1) & 3,
      ri = (c >> 2) & 3,
      bi = c >> 4;
    if (
      a !== 255 ||
      (b & 224) !== 224 ||
      v === 1 ||
      layer !== 1 ||
      ri === 3 ||
      bi === 0 ||
      bi === 15 ||
      d >> 6 !== 3
    )
      throw Error('Invalid MP3 frame');
    const sample = [44100, 48000, 32000][ri] / (v === 3 ? 1 : v === 2 ? 2 : 4),
      bitrate = (v === 3 ? tables.one : tables.other)[bi];
    if (rate !== null && (rate !== sample || version !== v)) throw Error('Inconsistent stream');
    rate = sample;
    version = v;
    const length = Math.floor(((v === 3 ? 144000 : 72000) * bitrate) / sample) + ((c >> 1) & 1);
    if (offset + length > bytes.length || length < 4) throw Error('Truncated frame');
    offset += length;
    frameBytes += length;
    frames++;
    duration += (v === 3 ? 1152 : 576) / sample;
  }
  duration = (frames * (version === 3 ? 1152 : 576)) / rate;
  if (!frames || offset !== bytes.length || tags > 262144 || duration < 90 || duration > 150)
    throw Error('Invalid duration');
  return { durationSeconds: duration, bitrate: (frameBytes * 8) / duration };
}
const isolated = !Object.keys(process.env).some((k) =>
  /CLOUDINARY|MONGODB_URI|SERVICE_KEY|JWT_KEY/.test(k),
);
process.once('message', async ({ kind, bytes: input }) => {
  try {
    let bytes = Buffer.from(input),
      metadata;
    if (!bytes.length || bytes.length > (kind === 'thumbnail' ? 2097152 : 3145728))
      throw Error('Size');
    if (kind === 'thumbnail') {
      const image = sharp(bytes, { limitInputPixels: 2560000, failOn: 'warning', animated: false });
      const m = await image.metadata();
      if (
        !['jpeg', 'png', 'webp'].includes(m.format) ||
        !m.width ||
        !m.height ||
        m.width > 1600 ||
        m.height > 1600 ||
        (m.pages ?? 1) !== 1
      )
        throw Error('Image');
      const output = await image
        .rotate()
        .webp({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      bytes = output.data;
      if (bytes.length > 2097152 || output.info.width > 1600 || output.info.height > 1600)
        throw Error('Size');
      metadata = {
        format: 'webp',
        width: output.info.width,
        height: output.info.height,
        durationSeconds: null,
        bitrate: null,
      };
    } else if (kind === 'audio') {
      const scan = mp3Frames(bytes);
      const m = await parseBuffer(
        bytes,
        { mimeType: 'audio/mpeg', size: bytes.length },
        { duration: true, skipCovers: true },
      );
      if (
        m.format.numberOfChannels !== 1 ||
        !Number.isFinite(m.format.duration) ||
        Math.abs(m.format.duration - scan.durationSeconds) > 0.1
      )
        throw Error('Audio');
      metadata = { format: 'mp3', width: null, height: null, ...scan };
    } else throw Error('Kind');
    process.send(
      {
        ok: true,
        isolated,
        bytes,
        metadata: {
          ...metadata,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        },
        peakRss: process.memoryUsage().rss,
      },
      () => process.disconnect(),
    );
  } catch {
    process.send({ ok: false, isolated }, () => process.disconnect());
  }
});
