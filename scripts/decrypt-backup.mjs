import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createDecipheriv } from 'node:crypto';
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error(
    'Usage: node --env-file=.env.cloud scripts/decrypt-backup.mjs INPUT.enc .local-deploy/restore/snapshot.json',
  );
const privateRoot = resolve('.local-deploy'),
  target = resolve(output);
if (!target.startsWith(privateRoot + sep))
  throw new Error('Decrypted data must stay inside ignored .local-deploy');
if (!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY ?? ''))
  throw new Error('Configure BACKUP_ENCRYPTION_KEY');
const encrypted = await readFile(input);
if (encrypted.subarray(0, 8).toString() !== 'VINLOOK1') throw new Error('Invalid backup file');
const cipher = createDecipheriv(
  'aes-256-gcm',
  Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex'),
  encrypted.subarray(8, 20),
);
cipher.setAuthTag(encrypted.subarray(20, 36));
const data = Buffer.concat([cipher.update(encrypted.subarray(36)), cipher.final()]);
JSON.parse(data.toString('utf8'));
await mkdir(resolve(target, '..'), { recursive: true });
await writeFile(target, data, { flag: 'wx', mode: 0o600 });
console.log(
  'Authenticated backup decrypted to the requested private path. Existing files were not overwritten.',
);
