import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sql from 'mssql';
import { get_pool, close_pool } from '../../src/config/database.js';

test('ERD has exactly eight POI tables and enforces users, visitor sessions, events and logs', async () => {
  const pool = await get_pool(); const tx = new sql.Transaction(pool); await tx.begin();
  const user = ('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString()), session = ('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString()), poi = ('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString());
  const request = () => new sql.Request(tx).input('user', sql.VarChar(36), user).input('session', sql.VarChar(36), session)
    .input('poi', sql.VarChar(36), poi);
  try {
    await request().input('username', sql.NVarChar(100), `erd-${user}`).query(`
      INSERT INTO dbo.users(id,username,password_hash,full_name) VALUES(@user,@username,'test-hash',N'ERD test');
      INSERT INTO dbo.visit_sessions(id) VALUES(@session);
      INSERT INTO dbo.pois(id,slug,name,description,address,latitude,longitude,category,created_by) VALUES(@poi,CONVERT(VARCHAR(36),@poi),N'Test',N'audio',N'address',10,106,'history',@user);
      INSERT INTO dbo.usage_events(session_id,poi_id,event_type,language_code) VALUES(@session,@poi,'audio_start','vi');
      INSERT INTO dbo.system_logs(user_id,poi_id,component,level,message) VALUES(@user,@poi,N'test','info',N'ERD test');
      INSERT INTO dbo.system_logs(component,level,message) VALUES(N'test','error',N'System event without user');`);
    const result = await request().query('SELECT name FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name');
    assert.deepEqual(result.recordset.map(row => row.name), ['admin_sessions','poi_images','poi_qr_codes','pois','system_logs','usage_events','users','visit_sessions']);
    const history=await request().query("SELECT name FROM sys.extended_properties WHERE class=0 AND name=N'Vinlook.Migration.008_remove_route_storage.sql'");
    assert.equal(history.recordset.length,1);
    await assert.rejects(request().query("INSERT INTO dbo.usage_events(session_id,event_type) VALUES(NEWID(),'audio_start')"));
    await assert.rejects(request().query("UPDATE dbo.users SET role='editor' WHERE id=@user"));
  } finally { await tx.rollback(); await close_pool(); }
});
