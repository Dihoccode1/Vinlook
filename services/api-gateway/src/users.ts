import { Router, json } from 'express';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import sql from 'mssql';
import { auth_pool } from './auth-store.js';

const derive = promisify(scrypt);
export interface UserInput { username: string; full_name: string; role: 'admin'|'staff'; status: 'active'|'disabled'; password?: string }
export function validate_user(body: unknown, creating: boolean): UserInput | undefined {
  if (!body || typeof body !== 'object') return;
  const b = body as Record<string, unknown>;
  if (typeof b.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,100}$/.test(b.username) || typeof b.full_name !== 'string' || !b.full_name.trim() || b.full_name.trim().length > 200 || !['admin','staff'].includes(String(b.role)) || !['active','disabled'].includes(String(b.status))) return;
  if ((creating || b.password !== undefined) && (typeof b.password !== 'string' || b.password.length < 5 || b.password.length > 200)) return;
  return { username: b.username, full_name: b.full_name.trim(), role: b.role as UserInput['role'], status: b.status as UserInput['status'], ...(typeof b.password === 'string' ? {password:b.password} : {}) };
}
const public_fields = 'id AS id, username AS username, full_name AS full_name, role AS role, status AS status, created_at AS created_at';
export function user_routes() {
  const router = Router();
  router.use((req, res, next) => {
    if (res.locals.adminUser?.role !== 'admin') { res.status(403).json({error:{message:'Chỉ Admin được quản lý tài khoản.'}}); return; }
    next();
  });
  router.get('/', async (_req, res) => {
    const pool = await auth_pool();
    res.json({data:(await pool.request().query(`SELECT ${public_fields} FROM dbo.users ORDER BY created_at DESC, username`)).recordset});
  });
  router.use(json({limit:'4kb'}));
  router.patch('/:id/status',async(req,res)=>{
    const id=String(req.params.id).toLowerCase();
    const status=req.body?.status;
    if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)||!['active','disabled'].includes(status)) {res.status(400).json({error:{message:'Trạng thái tài khoản không hợp lệ.'}});return;}
    const actor=(res.locals.adminUser.id as string).toLowerCase();
    const tx=new sql.Transaction(await auth_pool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const users=(await new sql.Request(tx).query<{id:string;username:string;role:string;status:string}>('SELECT id AS id,username AS username,role AS role,status AS status FROM dbo.users WITH (UPDLOCK,HOLDLOCK) ORDER BY id')).recordset;
      const target=users.find(u=>u.id.toLowerCase()===id);
      if(!target){await tx.rollback();res.status(404).json({error:{message:'Tài khoản không tồn tại.'}});return;}
      if(target.role==='admin'&&id!==actor&&status==='disabled'&&target.status!==status){await tx.rollback();res.status(403).json({error:{message:'Admin chỉ được khóa tài khoản Admin của chính mình.'}});return;}
      if(target.status!==status){
        await new sql.Request(tx).input('id',sql.UniqueIdentifier,id).input('status',sql.VarChar(20),status).query('UPDATE dbo.users SET status=@status WHERE id=@id; UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE user_id=@id AND revoked_at IS NULL');
        await new sql.Request(tx).input('actor',sql.UniqueIdentifier,actor).input('action',sql.VarChar(50),status==='disabled'?'user_locked':'user_unlocked').input('message',sql.NVarChar(sql.MAX),`${status==='disabled'?'Khóa':'Mở khóa'} tài khoản ${target.username}.`).query("INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@actor,'users','info',@action,@message)");
      }
      await tx.commit();res.json({data:{id,status}});
    }catch(error){await tx.rollback().catch(()=>{});throw error;}
  });
  async function save(req: import('express').Request, res: import('express').Response) {
    const creating = req.method === 'POST';
    const input = validate_user(req.body, creating);
    const id = creating ? null : String(req.params.id).toLowerCase();
    if (!input || (id && !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id))) { res.status(400).json({error:{message:'Kiểm tra thông tin: tài khoản 3–100 ký tự (chữ, số, _, ., -), họ tên và mật khẩu ít nhất 5 ký tự.'}}); return; }
    const actor = (res.locals.adminUser.id as string).toLowerCase();
    if (id === actor && input.role !== 'admin') { res.status(409).json({error:{message:'Bạn không thể hạ quyền tài khoản đang sử dụng.'}}); return; }
    let password_hash: string | null = null;
    if (input.password) { const salt = randomBytes(16).toString('hex'); password_hash = `${salt}:${(await derive(input.password, salt, 64) as Buffer).toString('hex')}`; }
    const tx = new sql.Transaction(await auth_pool());
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      // Check the current role while holding locks, so a concurrent update cannot bypass restrictions.
      const users = (await new sql.Request(tx).query<{id:string;role:string;status:string}>('SELECT id AS id, role AS role, status AS status FROM dbo.users WITH (UPDLOCK,HOLDLOCK) ORDER BY id')).recordset;
      const target = users.find(u=>u.id.toLowerCase()===id?.toLowerCase());
      if (!creating && !target) { await tx.rollback(); res.status(404).json({error:{message:'Tài khoản không tồn tại.'}}); return; }
      if(target?.role==='admin'&&id!==actor&&(input.role!=='admin'||(input.status==='disabled'&&target.status!==input.status))){await tx.rollback();res.status(403).json({error:{message:'Không được khóa hoặc hạ quyền Admin khác.'}});return;}
      const q = new sql.Request(tx).input('id',sql.UniqueIdentifier,id).input('username',sql.NVarChar(100),input.username).input('name',sql.NVarChar(200),input.full_name).input('role',sql.VarChar(20),input.role).input('status',sql.VarChar(20),input.status).input('hash',sql.VarChar(200),password_hash);
      const result = await q.query(creating ? `INSERT INTO dbo.users(username,password_hash,full_name,role,status) OUTPUT inserted.id AS id VALUES(@username,@hash,@name,@role,@status)` : `UPDATE dbo.users SET username=@username,full_name=@name,role=@role,status=@status,password_hash=COALESCE(@hash,password_hash) OUTPUT inserted.id AS id WHERE id=@id`);
      const saved_id = result.recordset[0].id as string;
      if (!creating && (password_hash || target!.role!==input.role || target!.status!==input.status)) await new sql.Request(tx).input('id',sql.UniqueIdentifier,saved_id).query('UPDATE dbo.admin_sessions SET revoked_at=SYSUTCDATETIME() WHERE user_id=@id AND revoked_at IS NULL');
      await new sql.Request(tx).input('actor',sql.UniqueIdentifier,actor).input('message',sql.NVarChar(sql.MAX),`${creating?'Tạo':'Cập nhật'} tài khoản ${input.username}; quyền ${input.role}; trạng thái ${input.status}${password_hash&&!creating?'; đổi mật khẩu':''}.`).query("INSERT INTO dbo.system_logs(user_id,component,level,action,message) VALUES(@actor,'users','info','user_change',@message)");
      await tx.commit(); res.status(creating?201:200).json({data:{id:saved_id}});
    } catch (error) {
      await tx.rollback().catch(()=>{});
      const code = (error as {number?:number}).number;
      if (code===2601||code===2627) { res.status(409).json({error:{message:'Tên tài khoản đã được sử dụng.'}}); return; }
      throw error;
    }
  }
  router.post('/', save); router.put('/:id', save);
  return router;
}
