import busboy from 'busboy';
import { MediaFailure, limits } from './validation.js';
export function readMultipart(request, kind, signal) {
  return new Promise((resolve, reject) => {
    const maximum = limits[kind];
    let parser,
      settled = false,
      received = 0,
      fileBytes = 0,
      files = 0;
    const chunks = [];
    const count = (chunk) => {
      received += chunk.length;
      if (received > maximum + limits.overhead) finish(new MediaFailure('MEDIA_TOO_LARGE', 413));
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      request.off('data', count);
      request.off('aborted', abort);
      request.off('error', abort);
      if (parser) {
        request.unpipe(parser);
        parser.destroy();
      }
      if (error) {
        request.resume();
        reject(error);
      } else resolve(Buffer.concat(chunks, fileBytes));
    };
    const abort = () => finish(new MediaFailure());
    const timer = setTimeout(abort, 30000);
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (!/^multipart\/form-data(?:;|$)/i.test(request.headers['content-type'] ?? ''))
      return finish(new MediaFailure('UNSUPPORTED_MEDIA_TYPE', 415));
    if (
      request.headers['content-length'] !== undefined &&
      (!/^\d+$/.test(request.headers['content-length']) ||
        Number(request.headers['content-length']) > maximum + limits.overhead)
    )
      return finish(new MediaFailure('MEDIA_TOO_LARGE', 413));
    try {
      parser = busboy({
        headers: request.headers,
        limits: { files: 1, fields: 0, parts: 2, fileSize: maximum + 1, headerPairs: 50 },
      });
    } catch {
      return finish(new MediaFailure('INVALID_MULTIPART', 400));
    }
    request.on('data', count);
    request.once('aborted', abort);
    request.once('error', abort);
    parser.on('file', (name, file) => {
      file.on('error', () => finish(new MediaFailure('INVALID_MULTIPART', 400)));
      files++;
      if (name !== 'file' || files !== 1) {
        file.resume();
        return finish(new MediaFailure('INVALID_MULTIPART', 400));
      }
      file.on('limit', () => finish(new MediaFailure('MEDIA_TOO_LARGE', 413)));
      file.on('error', () => finish(new MediaFailure('INVALID_MULTIPART', 400)));
      file.on('data', (chunk) => {
        if (!settled) {
          fileBytes += chunk.length;
          if (fileBytes > maximum) return finish(new MediaFailure('MEDIA_TOO_LARGE', 413));
          chunks.push(chunk);
        }
      });
    });
    for (const event of ['fieldsLimit', 'filesLimit', 'partsLimit'])
      parser.on(event, () => finish(new MediaFailure('INVALID_MULTIPART', 400)));
    parser.on('error', () => finish(new MediaFailure('INVALID_MULTIPART', 400)));
    parser.on('close', () =>
      files === 1 && fileBytes ? finish() : finish(new MediaFailure('INVALID_MULTIPART', 400)),
    );
    request.pipe(parser);
  });
}
