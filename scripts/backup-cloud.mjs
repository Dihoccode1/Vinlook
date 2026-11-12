/** Only ciphertext may be uploaded as a CI artifact. Keep the key outside artifacts. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, createCipheriv } from 'node:crypto';
import { transaction, close_postgres } from '@vinlook/server/postgres';

const key = process.env.BACKUP_ENCRYPTION_KEY;
if (!/^[a-f0-9]{64}$/i.test(key ?? ''))
  throw new Error('Configure a 32-byte hex BACKUP_ENCRYPTION_KEY before deploying');
try {
  const snapshot = await transaction(async (tx) => {
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const identity = (await tx.query('SELECT dataset_id FROM deployment_state WHERE id=1')).rows[0];
    if (identity?.dataset_id !== process.env.VINLOOK_DATASET_ID)
      throw new Error('Backup database identity mismatch');
    const tables = {};
    for (const { table_name: name } of (
      await tx.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='vinlook' AND table_type='BASE TABLE' ORDER BY table_name",
      )
    ).rows) {
      tables[name] = (
        await tx.query('SELECT * FROM vinlook."' + name.replaceAll('"', '""') + '"')
      ).rows;
    }
    return { created_at: new Date().toISOString(), dataset_id: identity.dataset_id, tables };
  });
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(snapshot), 'utf8'), cipher.final()]);
  const output = resolve('.local-deploy/cloud-backups');
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, 'pre-deploy.enc'),
    Buffer.concat([Buffer.from('VINLOOK1'), iv, cipher.getAuthTag(), data]),
    { mode: 0o600 },
  );
  console.log(
    'Encrypted pre-deploy database snapshot saved. Media remains in private persistent Storage.',
  );
} finally {
  await close_postgres();
}
