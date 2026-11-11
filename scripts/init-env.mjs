import { randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = resolve(root, '.env');
try {
  await readFile(target);
  console.log('.env already exists; no credentials were changed.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const password = randomBytes(24).toString('base64url') + 'Aa1!';
  const salt = randomBytes(16).toString('hex');
  const values = {
    SQLSERVER_PASSWORD: randomBytes(32).toString('base64url') + 'Aa1!',
    ADMIN_API_KEY: randomBytes(32).toString('hex'),
    ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
    // This translation adapter needs no paid subscription or API key.
    TRANSLATION_PROVIDERS: 'mymemory',
  };
  const example = await readFile(resolve(root, '.env.example'), 'utf8');
  const contents = example.replace(/^([A-Z0-9_]+)=(.*)$/gm, (line, key) =>
    Object.hasOwn(values, key) ? `${key}=${values[key]}` : line,
  );
  await mkdir(resolve(root, '.local-deploy'), { recursive: true });
  await writeFile(target, contents, { flag: 'wx', mode: 0o600 });
  await writeFile(
    resolve(root, '.local-deploy/bootstrap-admin.txt'),
    `Initial local administrator\nUsername: admin\nPassword: ${password}\nChange this password after the first login.\n`,
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Created ignored .env and .local-deploy/bootstrap-admin.txt. No secrets were printed.',
  );
}
