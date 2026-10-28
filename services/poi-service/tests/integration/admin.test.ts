import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sql from 'mssql';
import { adminRepository } from '../../src/modules/admin/admin.repository.js';
import { poiRepository } from '../../src/modules/pois/poi.repository.js';
import { getPool, closePool } from '../../src/config/database.js';

test('admin writes author and audit log atomically with the POI', async () => {
  const userId = randomUUID(), poiId = randomUUID(); const pool = await getPool();
  try {
    await pool.request().input('id', sql.UniqueIdentifier, userId).input('name', sql.NVarChar(100), `audit-${userId}`)
      .query("INSERT INTO dbo.Users(Id,Username,PasswordHash,FullName) VALUES(@id,@name,'test-only',N'Audit test')");
    const input = { name: 'Audit test', slug: `audit-${poiId}`, description: 'Narration', address: 'Test address', latitude: 10, longitude: 106, category: 'history' as const, sourceLanguage: 'vi' as const, isPublished: false };
    await adminRepository.save(poiId, input, true, userId);
    const created = await adminRepository.find(poiId); assert.ok(created);
    await adminRepository.save(poiId, { ...input, name: 'Edited', updatedAt: created.updatedAt }, false, userId);
    const result = await pool.request().input('id', sql.UniqueIdentifier, poiId).query(`SELECT CreatedBy,UpdatedBy FROM dbo.Pois WHERE Id=@id; SELECT Action FROM dbo.SystemLogs WHERE PoiId=@id ORDER BY Id`);
    assert.equal(result.recordsets[0][0].CreatedBy.toLowerCase(), userId);
    assert.equal(result.recordsets[0][0].UpdatedBy.toLowerCase(), userId);
    assert.deepEqual(result.recordsets[1].map((row: { Action: string }) => row.Action), ['poi_created', 'poi_updated']);
  } finally {
    await pool.request().input('poi', sql.UniqueIdentifier, poiId).input('user', sql.UniqueIdentifier, userId)
      .query('DELETE FROM dbo.SystemLogs WHERE PoiId=@poi; DELETE FROM dbo.Pois WHERE Id=@poi; DELETE FROM dbo.Users WHERE Id=@user');
    await closePool();
  }
});

test('SQL admin CRUD preserves draft privacy, saves photo atomically and rejects stale versions',async()=>{
  const id=randomUUID();const second=randomUUID();
  const input={name:'Địa điểm kiểm thử',slug:`admin-test-${id}`,description:'Nội dung tiếng Việt',visitorDescription:'Giới thiệu cho khách, tách khỏi bài thuyết minh.',address:'Địa chỉ thử',latitude:10.77,longitude:106.7,category:'history' as const,sourceLanguage:'vi' as const,isPublished:false};
  try{
    assert.equal(await adminRepository.save(id,input,true),true);
    assert.equal(await poiRepository.find(id),undefined);
    const first=await adminRepository.find(id);assert.ok(first);assert.equal(first.isPublished,false);
    await new Promise(resolve=>setTimeout(resolve,5));
    const jpeg=await readFile(new URL('../../database/seeds/images/ben-thanh.jpg',import.meta.url));
    assert.equal(await adminRepository.save(id,{...input,isPublished:true,updatedAt:first.updatedAt,imageCredit:'Test fixture',image:{contentType:'image/jpeg',base64:jpeg.toString('base64')}},false),true);
    assert.equal((await poiRepository.find(id))?.name,input.name);
    assert.equal((await poiRepository.find(id))?.visitorDescription,input.visitorDescription);
    assert.equal((await poiRepository.find(id))?.description,input.description);
    assert.deepEqual((await poiRepository.findImage(id))?.content,jpeg);
    assert.equal(await adminRepository.save(id,{...input,name:'Stale overwrite',updatedAt:first.updatedAt},false),false);
    assert.equal((await adminRepository.find(id))?.name,input.name);
    await assert.rejects(adminRepository.save(second,input,true));
    const latest=await adminRepository.find(id);assert.ok(latest);
    await assert.rejects(adminRepository.save(id,{...input,name:'Bad image update',updatedAt:latest.updatedAt,imageCredit:'Test',image:{contentType:'image/png',base64:jpeg.toString('base64')}},false));
    assert.equal((await adminRepository.find(id))?.name,input.name);
  }finally{
    const pool=await getPool();await pool.request().input('id',sql.UniqueIdentifier,id).input('second',sql.UniqueIdentifier,second).query('DELETE FROM dbo.Pois WHERE Id=@id OR Id=@second');await closePool();
  }
});
