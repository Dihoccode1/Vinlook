import { Router, json, type Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import {
  sql_auth_store,
  type AdminUser,
  type AuthStore,
  type LoginResult,
} from '../modules/auth/auth-store.js';
import { hash_password } from '../modules/auth/login-policy.js';

const cookie_name = 'vinlook_admin';
const ttl = 8 * 60 * 60 * 1000;

function respond_to_login_failure(
  res: Response,
  result: Exclude<LoginResult, { kind: 'success' }>,
  invalid_message: string,
  invalid_status = 401,
) {
  if (result.kind === 'locked') {
    res.status(423).json({
      error: {
        code: 'ACCOUNT_LOCKED',
        message:
          'Tài khoản đã bị khóa sau 15 lần nhập sai mật khẩu. Vui lòng liên hệ Admin khác để mở khóa.',
      },
    });
  } else if (result.kind === 'cooldown') {
    res.setHeader('Retry-After', String(result.retry_after));
    res.status(429).json({
      error: {
        code: 'LOGIN_COOLDOWN',
        retry_after: result.retry_after,
        message:
          'Bạn nhập sai quá nhiều lần. Vui lòng thử lại sau ' + result.retry_after + ' giây.',
      },
    });
  } else {
    res.status(invalid_status).json({ error: { message: invalid_message } });
  }
}

export function admin_auth(
  options = {
    username: process.env.ADMIN_USERNAME ?? 'admin',
    password_hash: process.env.ADMIN_PASSWORD_HASH ?? '',
    key: process.env.ADMIN_API_KEY ?? '',
  },
  store: AuthStore = sql_auth_store,
) {
  const router = Router();
  const secure = process.env.NODE_ENV === 'production';
  const token_hash = (value: string) => createHash('sha256').update(value).digest('hex');
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // Custom header prevents browser forms/cross-origin requests from mutating admin state.
  router.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) && req.get('x-vinlook-admin') !== '1') {
      res.status(403).json({ error: { message: 'Yêu cầu quản trị không hợp lệ.' } });
      return;
    }
    next();
  });
  router.post('/auth/login', json({ limit: '1kb' }), async (req, res) => {
    if (!options.key) {
      res.status(503).json({ error: { message: 'Tài khoản quản trị chưa được cấu hình.' } });
      return;
    }
    const { username, password } = req.body ?? {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length > 100 ||
      password.length > 200
    ) {
      res.status(400).json({ error: { message: 'Nhập tài khoản và mật khẩu hợp lệ.' } });
      return;
    }
    const result = await store.login(username.trim(), password);
    if (result.kind !== 'success') {
      respond_to_login_failure(res, result, 'Tài khoản hoặc mật khẩu không đúng.');
      return;
    }
    const user = result.user;
    const token = randomBytes(32).toString('hex');
    if (!(await store.create_session(token_hash(token), user, new Date(Date.now() + ttl)))) {
      res.status(401).json({
        error: {
          message: 'Thông tin hoặc trạng thái tài khoản đã thay đổi. Vui lòng đăng nhập lại.',
        },
      });
      return;
    }
    res.cookie(cookie_name, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure,
      path: '/api/admin',
      maxAge: ttl,
    });
    res.json({ data: { id: user.id, username: user.username, role: user.role } });
  });
  router.use(async (req, res, next) => {
    // Never accept a shared API key supplied by the browser or a dev proxy.
    delete req.headers['x-admin-key'];
    delete req.headers['x-admin-user-id'];
    const token =
      (req.get('cookie') ?? '')
        .split(';')
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${cookie_name}=`))
        ?.slice(cookie_name.length + 1) ?? '';
    const hash = token_hash(token);
    const user = token ? await store.find_session(hash) : undefined;
    if (!user) {
      res
        .status(401)
        .json({ error: { code: 'LOGIN_REQUIRED', message: 'Vui lòng đăng nhập quản trị.' } });
      return;
    }
    if (req.path === '/auth/logout' && req.method === 'POST') {
      await store.revoke_session(hash);
      res.clearCookie(cookie_name, {
        httpOnly: true,
        sameSite: 'strict',
        secure,
        path: '/api/admin',
      });
      res.status(204).end();
      return;
    }
    if (req.path === '/auth/session' && req.method === 'GET') {
      res.json({ data: { id: user.id, username: user.username, role: user.role } });
      return;
    }
    if (req.path === '/auth/password' && req.method === 'POST') {
      res.locals.adminUser = user;
      res.locals.session_hash = hash;
      next();
      return;
    }
    // Staff may use only overview and POI tools, including direct API requests.
    const staff_path = /^\/(stats|activity|geocode|pois(?:\/[^/]+(?:\/(?:image))?)?)\/?$/.test(
      req.path,
    );
    if (user.role !== 'admin' && !(user.role === 'staff' && staff_path)) {
      res.status(403).json({ error: { message: 'Bạn không có quyền truy cập chức năng này.' } });
      return;
    }
    res.locals.adminUser = user;
    req.headers['x-admin-key'] = options.key;
    req.headers['x-admin-user-id'] = user.id;
    next();
  });
  router.post('/auth/password', json({ limit: '4kb' }), async (req, res) => {
    const user = res.locals.adminUser as AdminUser;
    const { current_password, new_password, target_user_id = user.id } = req.body ?? {};
    if (
      typeof current_password !== 'string' ||
      !current_password ||
      current_password.length > 200 ||
      typeof new_password !== 'string' ||
      new_password.length < 8 ||
      new_password.length > 200 ||
      typeof target_user_id !== 'string' ||
      !/^USR\d{3,20}$/i.test(target_user_id)
    ) {
      res
        .status(400)
        .json({ error: { message: 'Nhập mật khẩu hiện tại và mật khẩu mới từ 8 đến 200 ký tự.' } });
      return;
    }
    const is_self = user.id.toUpperCase() === target_user_id.toUpperCase();
    if (!is_self && user.role !== 'admin') {
      res.status(403).json({ error: { message: 'Bạn chỉ có thể đổi mật khẩu của mình.' } });
      return;
    }
    if (is_self && new_password === current_password) {
      res.status(400).json({ error: { message: 'Hãy chọn mật khẩu khác mật khẩu hiện tại.' } });
      return;
    }
    const verified = await store.login(user.username, current_password);
    if (verified.kind !== 'success') {
      respond_to_login_failure(res, verified, 'Mật khẩu hiện tại không đúng.', 400);
      return;
    }
    if (
      verified.user.id !== user.id ||
      !(await store.change_password(
        verified.user,
        res.locals.session_hash,
        is_self ? user.id : target_user_id.toUpperCase(),
        await hash_password(new_password),
      ))
    ) {
      res.status(403).json({
        error: {
          message:
            'Không thể đổi mật khẩu tài khoản này. Hãy kiểm tra quyền hạn hoặc đăng nhập lại.',
        },
      });
      return;
    }
    if (is_self)
      res.clearCookie(cookie_name, {
        httpOnly: true,
        sameSite: 'strict',
        secure,
        path: '/api/admin',
      });
    res.json({ data: { changed: true } });
  });
  return router;
}
