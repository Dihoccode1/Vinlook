import { query, transaction } from '@vinlook/server/postgres';
import { password_matches, failed_login_state } from './login-policy.js';
import type { AuthStore, AdminUser } from './auth-store.js';

export const postgres_auth_store: AuthStore = {
  async login(username, password) {
    return transaction(async (tx) => {
      const row = (
        await tx.query(
          `SELECT *,clock_timestamp() AS server_now FROM users WHERE lower(username)=lower($1) FOR UPDATE`,
          [username],
        )
      ).rows[0];
      if (!row) {
        await password_matches(password);
        return { kind: 'invalid' };
      }
      if (row.login_locked) return { kind: 'locked' };
      if (row.status !== 'active' || !['admin', 'staff'].includes(row.role))
        return { kind: 'invalid' };
      if (row.login_retry_at && row.login_retry_at > row.server_now)
        return {
          kind: 'cooldown',
          retry_after: Math.ceil((row.login_retry_at.getTime() - row.server_now.getTime()) / 1000),
        };
      if (await password_matches(password, row.password_hash)) {
        await tx.query('UPDATE users SET failed_login_count=0,login_retry_at=NULL WHERE id=$1', [
          row.id,
        ]);
        return {
          kind: 'success',
          user: {
            id: row.id,
            username: row.username,
            password_hash: row.password_hash,
            role: row.role,
          },
        };
      }
      const state = failed_login_state(row.failed_login_count, row.server_now.getTime());
      await tx.query(
        `UPDATE users SET failed_login_count=$2,login_retry_at=$3,login_locked=$4,status=CASE WHEN $4 THEN 'disabled' ELSE status END WHERE id=$1`,
        [row.id, state.failed_login_count, state.login_retry_at, state.login_locked],
      );
      if (state.login_locked) {
        await tx.query(
          'UPDATE admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
          [row.id],
        );
        await tx.query(
          `INSERT INTO system_logs(user_id,component,level,action,message) VALUES($1,'admin-auth','warning','login_locked','Tự khóa tài khoản sau 15 lần nhập sai mật khẩu. Cần Admin khác mở khóa.')`,
          [row.id],
        );
      }
      return state.login_locked
        ? { kind: 'locked' }
        : state.retry_seconds
          ? { kind: 'cooldown', retry_after: state.retry_seconds }
          : { kind: 'invalid' };
    });
  },
  async find_user(username) {
    return (
      await query(
        `SELECT id,username,password_hash,role FROM users WHERE lower(username)=lower($1) AND status='active' AND role IN ('admin','staff')`,
        [username],
      )
    ).rows[0] as AdminUser | undefined;
  },
  async create_session(hash, user, expires) {
    return transaction(async (tx) => {
      const row = (
        await tx.query(
          `SELECT id FROM users WHERE id=$1 AND status='active' AND NOT login_locked AND password_hash=$2 FOR UPDATE`,
          [user.id, user.password_hash],
        )
      ).rows[0];
      if (!row) return false;
      await tx.query('INSERT INTO admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [
        hash,
        user.id,
        expires,
      ]);
      await tx.query(
        `INSERT INTO system_logs(user_id,component,level,action,message) VALUES($1,'admin-auth','info','login','Đăng nhập quản trị thành công.')`,
        [user.id],
      );
      return true;
    });
  },
  async find_session(hash) {
    return (
      await query(
        `SELECT u.id,u.username,u.password_hash,u.role FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND u.status='active' AND NOT u.login_locked AND u.role IN ('admin','staff')`,
        [hash],
      )
    ).rows[0] as AdminUser | undefined;
  },
  async revoke_session(hash) {
    await transaction(async (tx) => {
      const result = await tx.query(
        'UPDATE admin_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL RETURNING user_id',
        [hash],
      );
      if (result.rowCount)
        await tx.query(
          `INSERT INTO system_logs(user_id,component,level,action,message) VALUES($1,'admin-auth','info','logout','Đăng xuất quản trị.')`,
          [result.rows[0].user_id],
        );
    });
  },
};
