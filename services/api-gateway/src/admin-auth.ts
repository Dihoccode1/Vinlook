import { Router, json } from 'express';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sqlAuthStore, type AuthStore } from './auth-store.js';

const derive = promisify(scrypt);
const cookieName = 'vinlook_admin';
const ttl = 8 * 60 * 60 * 1000;
export function adminAuth(options = { username: process.env.ADMIN_USERNAME ?? 'admin', passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '', key: process.env.ADMIN_API_KEY ?? '' }, store: AuthStore = sqlAuthStore) {
  const router = Router();
  const attempts = new Map<string, { count: number; until: number }>();
  const secure = process.env.NODE_ENV === 'production';
  const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
  function prune() {
    for (const [ip, attempt] of attempts) if (attempt.until <= Date.now()) attempts.delete(ip);
  }
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  // Custom header prevents browser forms/cross-origin requests from mutating admin state.
  router.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.get('x-vinlook-admin') !== '1') { res.status(403).json({ error: { message: 'Yêu cầu quản trị không hợp lệ.' } }); return; }
    next();
  });
  router.post('/auth/login', json({ limit: '1kb' }), async (req, res) => {
    prune();
    const ip = req.ip ?? 'local';
    const attempt = attempts.get(ip);
    if (attempt && attempt.count >= 5) { res.setHeader('Retry-After', Math.ceil((attempt.until - Date.now()) / 1000)); res.status(429).json({ error: { message: 'Bạn nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.' } }); return; }
    if (!options.key) { res.status(503).json({ error: { message: 'Tài khoản quản trị chưa được cấu hình.' } }); return; }
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 100 || password.length > 200) { res.status(400).json({ error: { message: 'Nhập tài khoản và mật khẩu hợp lệ.' } }); return; }
    if (!attempt && attempts.size >= 1024) { res.status(429).json({ error: { message: 'Vui lòng thử lại sau.' } }); return; }
    // Count before awaiting password verification, including simultaneous requests.
    attempts.set(ip, { count: (attempt?.count ?? 0) + 1, until: attempt?.until ?? Date.now() + 900000 });
    const user = await store.findUser(username);
    const [salt, expected] = (user?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
    if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected)) { res.status(503).json({ error: { message: 'Cấu hình tài khoản không hợp lệ.' } }); return; }
    const actual = await derive(password, salt!, 64) as Buffer;
    if (!timingSafeEqual(actual, Buffer.from(expected!, 'hex')) || !user) { res.status(401).json({ error: { message: 'Tài khoản hoặc mật khẩu không đúng.' } }); return; }
    attempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    await store.createSession(tokenHash(token), user, new Date(Date.now() + ttl));
    res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure, path: '/api/admin', maxAge: ttl });
    res.json({ data: { username: user.username } });
  });
  router.use(async (req, res, next) => {
    prune();
    // Never accept a shared API key supplied by the browser or a dev proxy.
    delete req.headers['x-admin-key'];
    delete req.headers['x-admin-user-id'];
    const token = (req.get('cookie') ?? '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? '';
    const hash = tokenHash(token);
    const user = token ? await store.findSession(hash) : undefined;
    if (!user) { res.status(401).json({ error: { code: 'LOGIN_REQUIRED', message: 'Vui lòng đăng nhập quản trị.' } }); return; }
    if (req.path === '/auth/logout' && req.method === 'POST') {
      await store.revokeSession(hash); res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure, path: '/api/admin' }); res.status(204).end(); return;
    }
    if (req.path === '/auth/session' && req.method === 'GET') { res.json({ data: { username: user.username } }); return; }
    req.headers['x-admin-key'] = options.key;
    req.headers['x-admin-user-id'] = user.id;
    next();
  });
  return router;
}
