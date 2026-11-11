import sql from 'mssql';
import { password_matches, failed_login_state } from './login-policy.js';

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'staff';
}
export interface AuthStore {
  login(username: string, password: string): Promise<LoginResult>;
  find_user(username: string): Promise<AdminUser | undefined>;
  create_session(hash: string, user: AdminUser, expires: Date): Promise<boolean>;
  find_session(hash: string): Promise<AdminUser | undefined>;
  revoke_session(hash: string): Promise<void>;
}
export type LoginResult =
  | { kind: 'success'; user: AdminUser }
  | { kind: 'invalid' }
  | { kind: 'locked' }
  | { kind: 'cooldown'; retry_after: number };
let pending: Promise<sql.ConnectionPool> | undefined;
export function auth_pool() {
  pending ??= new sql.ConnectionPool({
    server: process.env.SQLSERVER_HOST ?? 'localhost',
    port: Number(process.env.SQLSERVER_PORT ?? 1433),
    database: process.env.SQLSERVER_DATABASE ?? 'PoiDb',
    user: process.env.SQLSERVER_USER ?? 'sa',
    password: process.env.SQLSERVER_PASSWORD ?? '',
    options: {
      encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
      trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true',
    },
    connectionTimeout: 5000,
    requestTimeout: 10000,
  })
    .connect()
    .then((pool) => {
      pool.on('error', () => console.error('Admin database connection error'));
      return pool;
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
const fields =
  'u.id AS id, u.username AS username, u.password_hash AS password_hash, u.role AS role';
export async function close_auth_pool() {
  if (pending) await (await pending).close();
  pending = undefined;
}

export const sql_auth_store: AuthStore = {
  async login(username, password) {
    const tx = new sql.Transaction(await auth_pool());
    await tx.begin();
    try {
      const row = (
        await new sql.Request(tx).input('username', sql.NVarChar(100), username).query<
          AdminUser & {
            status: string;
            failed_login_count: number;
            login_retry_at: Date | null;
            login_locked: boolean;
            server_now: Date;
          }
        >(`
        SELECT ${fields},u.status,u.failed_login_count,u.login_retry_at,u.login_locked,SYSUTCDATETIME() AS server_now
        FROM dbo.users u WITH(UPDLOCK,HOLDLOCK) WHERE u.username=@username`)
      ).recordset[0];
      if (!row) {
        await tx.commit();
        await password_matches(password);
        return { kind: 'invalid' };
      }
      if (row.login_locked) {
        await tx.commit();
        return { kind: 'locked' };
      }
      if (row.status !== 'active' || !['admin', 'staff'].includes(row.role)) {
        await tx.commit();
        return { kind: 'invalid' };
      }
      if (row.login_retry_at && row.login_retry_at > row.server_now) {
        await tx.commit();
        return {
          kind: 'cooldown',
          retry_after: Math.ceil((row.login_retry_at.getTime() - row.server_now.getTime()) / 1000),
        };
      }
      if (await password_matches(password, row.password_hash)) {
        await new sql.Request(tx)
          .input('id', sql.VarChar(36), row.id)
          .query('UPDATE dbo.users SET failed_login_count=0,login_retry_at=NULL WHERE id=@id');
        await tx.commit();
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
      await new sql.Request(tx)
        .input('id', sql.VarChar(36), row.id)
        .input('count', sql.Int, state.failed_login_count)
        .input('retry', sql.DateTime2, state.login_retry_at)
        .input('locked', sql.Bit, state.login_locked).query(`
          UPDATE dbo.users SET failed_login_count=@count,login_retry_at=@retry,login_locked=@locked,status=CASE WHEN @locked=1 THEN 'disabled' ELSE status END WHERE id=@id;
          IF @locked=1 BEGIN
            UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE user_id=@id AND revoked_at IS NULL;
            INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@id,'admin-auth','warning','login_locked',N'Tự khóa tài khoản sau 15 lần nhập sai mật khẩu. Cần Admin khác mở khóa.');
          END`);
      await tx.commit();
      return state.login_locked
        ? { kind: 'locked' }
        : state.retry_seconds
          ? { kind: 'cooldown', retry_after: state.retry_seconds }
          : { kind: 'invalid' };
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
  },
  async find_user(username) {
    const pool = await auth_pool();
    return (
      await pool
        .request()
        .input('username', sql.NVarChar(100), username)
        .query<AdminUser>(
          `SELECT ${fields} FROM dbo.users u WHERE u.username=@username AND u.status='active' AND u.role IN ('admin','staff')`,
        )
    ).recordset[0];
  },
  async create_session(hash, user, expires) {
    const pool = await auth_pool();
    const result = await pool
      .request()
      .input('hash', sql.Char(64), hash)
      .input('user', sql.VarChar(36), user.id)
      .input('expires', sql.DateTime2, expires)
      .input('password_hash', sql.VarChar(200), user.password_hash).query(`
      SET XACT_ABORT ON; BEGIN TRANSACTION;
      IF NOT EXISTS(SELECT 1 FROM dbo.users WITH(UPDLOCK,HOLDLOCK) WHERE id=@user AND status='active' AND login_locked=0 AND password_hash=@password_hash)
      BEGIN SELECT CAST(0 AS BIT) AS created; COMMIT TRANSACTION; RETURN; END;
      INSERT INTO dbo.admin_sessions(token_hash,user_id,expires_at) VALUES(@hash,@user,@expires);
      INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@user,N'admin-auth','info','login',N'Đăng nhập quản trị thành công.');
      SELECT CAST(1 AS BIT) AS created; COMMIT TRANSACTION;`);
    return result.recordset[0]?.created === true;
  },
  async find_session(hash) {
    const pool = await auth_pool();
    return (
      await pool.request().input('hash', sql.Char(64), hash)
        .query<AdminUser>(`SELECT ${fields} FROM dbo.admin_sessions s JOIN dbo.users u ON u.id=s.user_id
      WHERE s.token_hash=@hash AND s.expires_at>SYSUTCDATETIME() AND s.revoked_at IS NULL AND u.status='active' AND u.role IN ('admin','staff')`)
    ).recordset[0];
  },
  async revoke_session(hash) {
    const pool = await auth_pool();
    await pool.request().input('hash', sql.Char(64), hash)
      .query(`UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE token_hash=@hash AND revoked_at IS NULL;
      IF @@ROWCOUNT>0 INSERT INTO dbo.system_logs(user_id,component,level,action,message)
        SELECT user_id,N'admin-auth','info','logout',N'Đăng xuất quản trị.' FROM dbo.admin_sessions WHERE token_hash=@hash;`);
  },
};
