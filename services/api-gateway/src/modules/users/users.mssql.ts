import sql from 'mssql';
import { auth_pool } from '../auth/auth-store.js';
import {
  account_context,
  assert_status_change,
  assert_user_change,
  type UserRepository,
} from './users.service.js';
const public_fields =
  'id AS id, username AS username, full_name AS full_name, role AS role, status AS status, created_at AS created_at, login_locked AS login_locked';
export const mssql_users: UserRepository = {
  normalize: (id) => id.toLowerCase(),
  invalid_input_message:
    'Kiểm tra thông tin: tài khoản 3–100 ký tự (chữ, số, _, ., -), họ tên và mật khẩu ít nhất 5 ký tự.',
  async list() {
    const pool = await auth_pool();
    return (
      await pool
        .request()
        .query(`SELECT ${public_fields} FROM dbo.users ORDER BY created_at DESC, username`)
    ).recordset;
  },
  async is_taken(username) {
    const pool = await auth_pool();
    return (
      (
        await pool
          .request()
          .input('username', sql.NVarChar(100), username)
          .query('SELECT TOP (1) 1 FROM dbo.users WHERE username=@username')
      ).recordset.length > 0
    );
  },
  async change_status(id, status, actor) {
    const tx = new sql.Transaction(await auth_pool());
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const users = (
        await new sql.Request(tx).query<{
          id: string;
          username: string;
          role: string;
          status: string;
          login_locked: boolean;
        }>(
          'SELECT id AS id,username AS username,role AS role,status AS status,login_locked FROM dbo.users WITH (UPDLOCK,HOLDLOCK) ORDER BY id',
        )
      ).recordset;
      const { target } = account_context(users, actor, id);
      assert_status_change(target!, status, actor);
      if (target!.status !== status) {
        await new sql.Request(tx)
          .input('id', sql.VarChar(36), id)
          .input('status', sql.VarChar(20), status)
          .query(
            `UPDATE dbo.users SET status=@status,failed_login_count=CASE WHEN @status='active' THEN 0 ELSE failed_login_count END,login_retry_at=CASE WHEN @status='active' THEN NULL ELSE login_retry_at END,login_locked=CASE WHEN @status='active' THEN 0 ELSE login_locked END WHERE id=@id; UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE user_id=@id AND revoked_at IS NULL`,
          );
        await new sql.Request(tx)
          .input('actor', sql.VarChar(36), actor)
          .input('action', sql.VarChar(50), status === 'disabled' ? 'user_locked' : 'user_unlocked')
          .input(
            'message',
            sql.NVarChar(sql.MAX),
            `${status === 'disabled' ? 'Khóa' : 'Mở khóa'} tài khoản ${target!.username}.`,
          )
          .query(
            "INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@actor,'users','info',@action,@message)",
          );
      }
      await tx.commit();
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  },
  async save(id, input, actor, password_hash) {
    const creating = id === null;
    const tx = new sql.Transaction(await auth_pool());
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      // Check the current role while holding locks, so a concurrent update cannot bypass restrictions.
      const users = (
        await new sql.Request(tx).query<{
          id: string;
          username: string;
          role: string;
          status: string;
          login_locked: boolean;
        }>(
          'SELECT id AS id, username, role AS role, status AS status,login_locked FROM dbo.users WITH (UPDLOCK,HOLDLOCK) ORDER BY id',
        )
      ).recordset;
      const { current, target } = account_context(users, actor, id);
      assert_user_change(current, target, input);
      const q = new sql.Request(tx)
        .input('id', sql.VarChar(36), id)
        .input('username', sql.NVarChar(100), input.username)
        .input('name', sql.NVarChar(200), input.full_name)
        .input('role', sql.VarChar(20), input.role)
        .input('status', sql.VarChar(20), input.status)
        .input('hash', sql.VarChar(200), password_hash);
      const result = await q.query(
        creating
          ? `INSERT INTO dbo.users(username,password_hash,full_name,role,status) OUTPUT inserted.id AS id VALUES(@username,@hash,@name,@role,@status)`
          : `UPDATE dbo.users SET username=@username,full_name=@name,role=@role,status=@status,password_hash=COALESCE(@hash,password_hash) OUTPUT inserted.id AS id WHERE id=@id`,
      );
      const saved_id = result.recordset[0].id as string;
      if (
        !creating &&
        (password_hash || target!.role !== input.role || target!.status !== input.status)
      )
        await new sql.Request(tx)
          .input('id', sql.VarChar(36), saved_id)
          .query(
            'UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE user_id=@id AND revoked_at IS NULL',
          );
      await new sql.Request(tx)
        .input('actor', sql.VarChar(36), actor)
        .input(
          'message',
          sql.NVarChar(sql.MAX),
          `${creating ? 'Tạo' : 'Cập nhật'} tài khoản ${input.username}; quyền ${input.role}; trạng thái ${input.status}${password_hash && !creating ? '; đổi mật khẩu' : ''}.`,
        )
        .query(
          "INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@actor,'users','info','user_change',@message)",
        );
      await tx.commit();
      return saved_id;
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  },
};
