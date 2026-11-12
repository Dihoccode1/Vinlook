import { Router, json } from 'express';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { query, transaction } from '@vinlook/server/postgres';
import { validate_user } from './users.js';

const derive = promisify(scrypt);
const fields = 'id,username,full_name,role,status,created_at,login_locked';
class UserError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function postgres_user_routes() {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.adminUser?.role !== 'admin') {
      res.status(403).json({ error: { message: 'Chỉ Admin được quản lý tài khoản.' } });
      return;
    }
    next();
  });
  router.get('/', async (_req, res) => {
    res.json({
      data: (await query(`SELECT ${fields} FROM users ORDER BY created_at DESC,username`)).rows,
    });
  });
  router.use(json({ limit: '4kb' }));
  router.patch('/:id/status', async (req, res) => {
    const id = String(req.params.id).toUpperCase(),
      status = req.body?.status;
    if (!/^USR\d{3,20}$/.test(id) || !['active', 'disabled'].includes(status)) {
      res.status(400).json({ error: { message: 'Trạng thái tài khoản không hợp lệ.' } });
      return;
    }
    await transaction(async (tx) => {
      // The same lock order is used by all account changes.
      const users = (
        await tx.query(
          'SELECT id,username,role,status,login_locked FROM users ORDER BY id FOR UPDATE',
        )
      ).rows;
      const target = users.find((user) => user.id === id);
      const actor = String(res.locals.adminUser.id).toUpperCase();
      if (!target) throw new UserError(404, 'Tài khoản không tồn tại.');
      if (target.username.toLowerCase() === 'admin' && status === 'disabled')
        throw new UserError(403, 'Không thể khóa tài khoản root admin.');
      if (target.login_locked && (id === actor || status !== 'active'))
        throw new UserError(403, 'Tài khoản bị khóa do đăng nhập sai chỉ được Admin khác mở khóa.');
      if (target.status !== status) {
        await tx.query(
          `UPDATE users SET status=$2::varchar,failed_login_count=CASE WHEN $2='active' THEN 0 ELSE failed_login_count END,login_retry_at=CASE WHEN $2='active' THEN NULL ELSE login_retry_at END,login_locked=CASE WHEN $2='active' THEN false ELSE login_locked END WHERE id=$1`,
          [id, status],
        );
        await tx.query(
          'UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
          [id],
        );
        await tx.query(
          `INSERT INTO system_logs(user_id,component,level,action,message) VALUES($1,'users','info',$2,$3)`,
          [
            actor,
            status === 'disabled' ? 'user_locked' : 'user_unlocked',
            `${status === 'disabled' ? 'Khóa' : 'Mở khóa'} tài khoản ${target.username}.`,
          ],
        );
      }
    });
    res.json({ data: { id, status } });
  });
  const save: import('express').RequestHandler = async (req, res) => {
    const creating = req.method === 'POST',
      input = validate_user(req.body, creating);
    const id = creating ? null : String(req.params.id).toUpperCase(),
      actor = String(res.locals.adminUser.id).toUpperCase();
    if (!input || (id && !/^USR\d{3,20}$/.test(id))) {
      res.status(400).json({ error: { message: 'Kiểm tra thông tin tài khoản.' } });
      return;
    }
    if (id === actor && input.role !== 'admin')
      throw new UserError(409, 'Bạn không thể hạ quyền tài khoản đang sử dụng.');
    let hash: string | null = null;
    if (input.password) {
      const salt = randomBytes(16).toString('hex');
      hash = `${salt}:${((await derive(input.password, salt, 64)) as Buffer).toString('hex')}`;
    }
    const saved = await transaction(async (tx) => {
      const users = (
        await tx.query(
          'SELECT id,username,role,status,login_locked FROM users ORDER BY id FOR UPDATE',
        )
      ).rows;
      const target = users.find((user) => user.id === id);
      if (!creating && !target) throw new UserError(404, 'Tài khoản không tồn tại.');
      if (
        target?.username.toLowerCase() === 'admin' &&
        (input.status !== 'active' || input.role !== 'admin' || input.username !== 'admin')
      )
        throw new UserError(
          403,
          'Tài khoản root admin không được khóa, đổi tên đăng nhập hoặc hạ quyền.',
        );
      if (target?.role === 'admin' && id !== actor)
        throw new UserError(403, 'Không được chỉnh sửa hoặc đổi mật khẩu tài khoản Admin khác.');
      if (target?.login_locked && input.status === 'active')
        throw new UserError(409, 'Vui lòng dùng nút Mở khóa để Admin khác mở lại tài khoản.');
      const result = creating
        ? await tx.query(
            'INSERT INTO users(username,password_hash,full_name,role,status) VALUES($1,$2,$3,$4,$5) RETURNING id',
            [input.username, hash, input.full_name, input.role, input.status],
          )
        : await tx.query(
            'UPDATE users SET username=$2,full_name=$3,role=$4,status=$5,password_hash=COALESCE($6,password_hash) WHERE id=$1 RETURNING id',
            [id, input.username, input.full_name, input.role, input.status, hash],
          );
      const saved_id = result.rows[0].id;
      if (!creating && (hash || target!.role !== input.role || target!.status !== input.status))
        await tx.query(
          'UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
          [saved_id],
        );
      await tx.query(
        `INSERT INTO system_logs(user_id,component,level,action,message) VALUES($1,'users','info','user_change',$2)`,
        [
          actor,
          `${creating ? 'Tạo' : 'Cập nhật'} tài khoản ${input.username}; quyền ${input.role}; trạng thái ${input.status}${hash && !creating ? '; đổi mật khẩu' : ''}.`,
        ],
      );
      return saved_id;
    });
    res.status(creating ? 201 : 200).json({ data: { id: saved } });
  };
  router.post('/', save);
  router.put('/:id', save);
  router.use(((error, _req, res, next) => {
    if (error instanceof UserError) {
      res.status(error.status).json({ error: { message: error.message } });
      return;
    }
    if (error?.code === '23505') {
      res.status(409).json({ error: { message: 'Tên tài khoản đã được sử dụng.' } });
      return;
    }
    next(error);
  }) as import('express').ErrorRequestHandler);
  return router;
}
