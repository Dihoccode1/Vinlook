import sql from 'mssql';

export interface AdminUser { id: string; username: string; passwordHash: string }
export interface AuthStore {
  findUser(username: string): Promise<AdminUser | undefined>;
  createSession(hash: string, user: AdminUser, expires: Date): Promise<void>;
  findSession(hash: string): Promise<AdminUser | undefined>;
  revokeSession(hash: string): Promise<void>;
}
let pending: Promise<sql.ConnectionPool> | undefined;
export function authPool() {
  pending ??= new sql.ConnectionPool({
    server: process.env.SQLSERVER_HOST ?? 'localhost', port: Number(process.env.SQLSERVER_PORT ?? 1433),
    database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '',
    options: { encrypt: process.env.SQLSERVER_ENCRYPT !== 'false', trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true' },
    connectionTimeout: 5000, requestTimeout: 10000,
  }).connect().then(pool => { pool.on('error', () => console.error('Admin database connection error')); return pool; }).catch(error => { pending = undefined; throw error; });
  return pending;
}
const fields = 'u.Id AS id, u.Username AS username, u.PasswordHash AS passwordHash';
export const sqlAuthStore: AuthStore = {
  async findUser(username) {
    const pool = await authPool();
    return (await pool.request().input('username', sql.NVarChar(100), username).query<AdminUser>(`SELECT ${fields} FROM dbo.Users u WHERE u.Username=@username AND u.Status='active' AND u.Role='admin'`)).recordset[0];
  },
  async createSession(hash, user, expires) {
    const pool = await authPool();
    await pool.request().input('hash', sql.Char(64), hash).input('user', sql.UniqueIdentifier, user.id).input('expires', sql.DateTime2, expires).query(`
      SET XACT_ABORT ON; BEGIN TRANSACTION;
      INSERT INTO dbo.AdminSessions(TokenHash,UserId,ExpiresAt) VALUES(@hash,@user,@expires);
      INSERT INTO dbo.SystemLogs(UserId,Component,Level,Action,Message) VALUES(@user,N'admin-auth','info','login',N'Đăng nhập quản trị thành công.');
      COMMIT TRANSACTION;`);
  },
  async findSession(hash) {
    const pool = await authPool();
    return (await pool.request().input('hash', sql.Char(64), hash).query<AdminUser>(`SELECT ${fields} FROM dbo.AdminSessions s JOIN dbo.Users u ON u.Id=s.UserId
      WHERE s.TokenHash=@hash AND s.ExpiresAt>SYSUTCDATETIME() AND s.RevokedAt IS NULL AND u.Status='active' AND u.Role='admin'`)).recordset[0];
  },
  async revokeSession(hash) {
    const pool = await authPool();
    await pool.request().input('hash', sql.Char(64), hash).query(`UPDATE dbo.AdminSessions SET RevokedAt=SYSUTCDATETIME() WHERE TokenHash=@hash AND RevokedAt IS NULL;
      IF @@ROWCOUNT>0 INSERT INTO dbo.SystemLogs(UserId,Component,Level,Action,Message)
        SELECT UserId,N'admin-auth','info','logout',N'Đăng xuất quản trị.' FROM dbo.AdminSessions WHERE TokenHash=@hash;`);
  },
};
