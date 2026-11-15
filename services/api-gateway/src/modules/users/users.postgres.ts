import { query, transaction } from '@vinlook/server/postgres';
import {
  account_context,
  assert_status_change,
  assert_user_change,
  type Account,
  type UserRepository,
} from './users.service.js';
const fields = 'id,username,full_name,role,status,created_at,login_locked';
export const postgres_users: UserRepository = {
  normalize: (id) => id.toUpperCase(),
  invalid_input_message: 'Kiểm tra thông tin tài khoản.',
  async list() {
    return (await query(`SELECT ${fields} FROM users ORDER BY created_at DESC,username`)).rows;
  },
  async is_taken(username) {
    return (
      (await query('SELECT 1 FROM users WHERE lower(username)=lower($1) LIMIT 1', [username])).rows
        .length > 0
    );
  },
  async change_status(id, status, actor) {
    return transaction(async (tx) => {
      // The same lock order is used by all account changes.
      const users = (
        await tx.query<Account>(
          'SELECT id,username,role,status,login_locked FROM users ORDER BY id FOR UPDATE',
        )
      ).rows;

      const { target } = account_context(users, actor, id);
      assert_status_change(target!, status, actor);
      if (target!.status !== status) {
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
            `${status === 'disabled' ? 'Khóa' : 'Mở khóa'} tài khoản ${target!.username}.`,
          ],
        );
      }
    });
  },
  async save(id, input, actor, hash) {
    const creating = id === null;
    const saved = await transaction(async (tx) => {
      const users = (
        await tx.query<Account>(
          'SELECT id,username,role,status,login_locked FROM users ORDER BY id FOR UPDATE',
        )
      ).rows;
      const { current, target } = account_context(users, actor, id);
      assert_user_change(current, target, input);
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
    return saved;
  },
};
