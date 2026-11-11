import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export async function password_matches(password: string, hash?: string) {
  const [salt, expected] = (hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected))
    throw Error('Invalid stored password hash');
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && hash !== undefined;
}
export function failed_login_state(count: number, now: number) {
  const failed_login_count = Math.min(count + 1, 15);
  const login_locked = failed_login_count >= 15;
  const retry_seconds = failed_login_count === 5 ? 30 : failed_login_count === 10 ? 60 : 0;
  return {
    failed_login_count,
    login_locked,
    login_retry_at: retry_seconds ? new Date(now + retry_seconds * 1000) : null,
    retry_seconds,
  };
}
