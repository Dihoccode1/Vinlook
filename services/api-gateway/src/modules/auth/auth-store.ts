import sql from 'mssql';

export interface AdminUser { id: string; username: string; password_hash: string; role: 'admin' | 'staff' }
export interface AuthStore {
  find_user(username: string): Promise<AdminUser | undefined>;
  create_session(hash: string, user: AdminUser, expires: Date): Promise<void>;
  find_session(hash: string): Promise<AdminUser | undefined>;
  revoke_session(hash: string): Promise<void>;
}
let pending: Promise<sql.ConnectionPool> | undefined;
export function auth_pool() {
  pending ??= new sql.ConnectionPool({
    server: process.env.SQLSERVER_HOST ?? 'localhost', port: Number(process.env.SQLSERVER_PORT ?? 1433),
    database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '',
    options: { encrypt: process.env.SQLSERVER_ENCRYPT !== 'false', trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true' },
    connectionTimeout: 5000, requestTimeout: 10000,
  }).connect().then(pool => { pool.on('error', () => console.error('Admin database connection error')); return pool; }).catch(error => { pending = undefined; throw error; });
  return pending;
}
const fields = 'u.id AS id, u.username AS username, u.password_hash AS password_hash, u.role AS role';
export const sql_auth_store: AuthStore = {
  async find_user(username) {
    const pool = await auth_pool();
    return (await pool.request().input('username', sql.NVarChar(100), username).query<AdminUser>(`SELECT ${fields} FROM dbo.users u WHERE u.username=@username AND u.status='active' AND u.role IN ('admin','staff')`)).recordset[0];
  },
  async create_session(hash, user, expires) {
    const pool = await auth_pool();
    await pool.request().input('hash', sql.Char(64), hash).input('user', sql.VarChar(36), user.id).input('expires', sql.DateTime2, expires).query(`
      SET XACT_ABORT ON; BEGIN TRANSACTION;
      INSERT INTO dbo.admin_sessions(token_hash,user_id,expires_at) VALUES(@hash,@user,@expires);
      INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@user,N'admin-auth','info','login',N'Đăng nhập quản trị thành công.');
      COMMIT TRANSACTION;`);
  },
  async find_session(hash) {
    const pool = await auth_pool();
    return (await pool.request().input('hash', sql.Char(64), hash).query<AdminUser>(`SELECT ${fields} FROM dbo.admin_sessions s JOIN dbo.users u ON u.id=s.user_id
      WHERE s.token_hash=@hash AND s.expires_at>SYSUTCDATETIME() AND s.revoked_at IS NULL AND u.status='active' AND u.role IN ('admin','staff')`)).recordset[0];
  },
  async revoke_session(hash) {
    const pool = await auth_pool();
    await pool.request().input('hash', sql.Char(64), hash).query(`UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE token_hash=@hash AND revoked_at IS NULL;
      IF @@ROWCOUNT>0 INSERT INTO dbo.system_logs(user_id,component,level,action,message)
        SELECT user_id,N'admin-auth','info','logout',N'Đăng xuất quản trị.' FROM dbo.admin_sessions WHERE token_hash=@hash;`);
  },
};
