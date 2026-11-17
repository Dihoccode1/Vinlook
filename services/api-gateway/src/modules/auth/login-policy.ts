import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export async function hash_password(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function password_matches(password: string, hash?: string) {
  const [salt, expected] = (hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected))
    throw Error('Invalid stored password hash');
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && hash !== undefined;
}
export const max_failed_logins = 3;

export function failed_login_state(count: number) {
  const failed_login_count = Math.min(count + 1, max_failed_logins);
  return { failed_login_count, login_locked: failed_login_count >= max_failed_logins };
}
