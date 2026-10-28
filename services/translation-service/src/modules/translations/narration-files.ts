import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { supportsLanguage } from '../languages/languages.js';
import type { NarrationRepository } from './narration.repository.js';

export function createNarrationFileStore(root = fileURLToPath(new URL('../../../storage/narrations/', import.meta.url))): NarrationRepository {
  function path(id: string, language: string, hash: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !supportsLanguage(language) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid narration file key');
    return join(root, id.toLowerCase(), `${language}-${hash}.wav`);
  }
  function valid(audio: Buffer) { return audio.length >= 44 && audio.length <= 21000000 && audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE'; }
  return {
    async find(id, language, hash) {
      try { const audio = await readFile(path(id, language, hash)); return valid(audio) ? audio : undefined; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
    },
    async save(id, language, hash, audio) {
      if (!valid(audio)) throw new Error('Invalid WAV file');
      const target = path(id, language, hash);
      await mkdir(join(root, id.toLowerCase()), { recursive: true });
      const temporary = `${target}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, audio, { flag: 'wx' }); await rename(temporary, target); }
      finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }); }
    },
  };
}
