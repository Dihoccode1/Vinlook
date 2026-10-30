import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sql from 'mssql';
import { admin_repository } from '../../src/modules/admin/admin.repository.js';
import { poi_repository } from '../../src/modules/pois/poi.repository.js';
import { get_pool, close_pool } from '../../src/config/database.js';

test('admin writes author and audit log atomically with the POI', async () => {
  const user_id = ('USR'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString()), poi_id = ('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString()); const pool = await get_pool();
  try {
    await pool.request().input('id', sql.VarChar(36), user_id).input('name', sql.NVarChar(100), `audit-${user_id}`)
      .query("INSERT INTO dbo.users(id,username,password_hash,full_name) VALUES(@id,@name,'test-only',N'Audit test')");
    const input = { name: 'Audit test', slug: `audit-${poi_id}`, description: 'Narration', address: 'Test address', latitude: 10, longitude: 106, category: 'history' as const, source_language: 'vi' as const, is_published: false };
    await admin_repository.save(poi_id, input, true, user_id);
    const created = await admin_repository.find(poi_id); assert.ok(created);
    const qr=await pool.request().input('id',sql.VarChar(36),poi_id).query('SELECT qr_token FROM dbo.poi_qr_codes WHERE poi_id=@id');assert.match(qr.recordset[0].qr_token,/^[a-f0-9]{32}$/);
    await admin_repository.save(poi_id, { ...input, name: 'Edited', updated_at: created.updated_at }, false, user_id);
    const result = await pool.request().input('id', sql.VarChar(36), poi_id).query(`SELECT created_by,updated_by FROM dbo.pois WHERE id=@id; SELECT action FROM dbo.system_logs WHERE poi_id=@id ORDER BY id`);
    assert.equal(result.recordsets[0][0].created_by, user_id);
    assert.equal(result.recordsets[0][0].updated_by, user_id);
    assert.deepEqual(result.recordsets[1].map((row: { action: string }) => row.action), ['poi_created', 'poi_updated']);
  } finally {
    await pool.request().input('poi', sql.VarChar(36), poi_id).input('user', sql.VarChar(36), user_id)
      .query('DELETE FROM dbo.system_logs WHERE poi_id=@poi; DELETE FROM dbo.poi_qr_codes WHERE poi_id=@poi; DELETE FROM dbo.pois WHERE id=@poi; DELETE FROM dbo.users WHERE id=@user');
    await close_pool();
  }
});

test('SQL admin CRUD preserves draft privacy, saves photo atomically and rejects stale versions',async()=>{
  const id=('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString());const second=('POI'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString());
  const input={name:'Địa điểm kiểm thử',slug:`admin-test-${id}`,description:'Nội dung tiếng Việt',visitor_description:'Giới thiệu cho khách, tách khỏi bài thuyết minh.',address:'Địa chỉ thử',latitude:10.77,longitude:106.7,category:'history' as const,source_language:'vi' as const,is_published:false};
  try{
    assert.equal(await admin_repository.save(id,input,true),true);
    assert.equal(await poi_repository.find(id),undefined);
    const first=await admin_repository.find(id);assert.ok(first);assert.equal(first.is_published,false);
    await new Promise(resolve=>setTimeout(resolve,5));
    const jpeg=await readFile(new URL('../../database/seeds/images/ben-thanh.jpg',import.meta.url));
    assert.equal(await admin_repository.save(id,{...input,is_published:true,updated_at:first.updated_at,image_credit:'Test fixture',image:{content_type:'image/jpeg',base64:jpeg.toString('base64')}},false),true);
    assert.equal((await poi_repository.find(id))?.name,input.name);
    assert.equal((await poi_repository.find(id))?.visitor_description,input.visitor_description);
    assert.equal((await poi_repository.find(id))?.description,input.description);
    assert.deepEqual((await poi_repository.find_image(id))?.content,jpeg);
    assert.equal(await admin_repository.save(id,{...input,name:'Stale overwrite',updated_at:first.updated_at},false),false);
    assert.equal((await admin_repository.find(id))?.name,input.name);
    await assert.rejects(admin_repository.save(second,input,true));
    const latest=await admin_repository.find(id);assert.ok(latest);
    await assert.rejects(admin_repository.save(id,{...input,name:'Bad image update',updated_at:latest.updated_at,image_credit:'Test',image:{content_type:'image/png',base64:jpeg.toString('base64')}},false));
    assert.equal((await admin_repository.find(id))?.name,input.name);
  }finally{
    const pool=await get_pool();await pool.request().input('id',sql.VarChar(36),id).input('second',sql.VarChar(36),second).query('DELETE FROM dbo.poi_qr_codes WHERE poi_id=@id OR poi_id=@second; DELETE FROM dbo.pois WHERE id=@id OR id=@second');await close_pool();
  }
});
