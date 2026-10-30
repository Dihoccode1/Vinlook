import test from 'node:test';
import assert from 'node:assert/strict';
import sql from 'mssql';
import {get_pool,close_pool} from '../../src/config/database.js';
import {qr_repository} from '../../src/modules/pois/qr.repository.js';

test('QR tokens persist across concurrent requests, are unique and resolve only published POIs',async()=>{
  const pool=await get_pool();let ids:string[]=[];
  try{
    ids=(await pool.request().query<{id:string}>(`INSERT INTO dbo.pois(slug,name,description,address,latitude,longitude,category,is_published)
      OUTPUT inserted.id VALUES(CONVERT(VARCHAR(36),NEWID()),N'QR test',N'test',N'test',10,106,'history',1),
      (CONVERT(VARCHAR(36),NEWID()),N'QR draft',N'test',N'test',10,106,'history',0)`)).recordset.map(r=>r.id);
    const rows=await Promise.all(Array.from({length:5},()=>qr_repository.ensure(ids[0])));
    assert.ok(rows.every(row=>row?.qr_token===rows[0]?.qr_token));
    const first=rows[0]!;assert.match(first.qr_token,/^[a-f0-9]{32}$/);assert.equal(first.qr_image_url,null);
    assert.equal((await qr_repository.ensure(ids[0]))?.created_at.getTime(),first.created_at.getTime());
    assert.equal(await qr_repository.resolve(first.qr_token),ids[0]);
    const draft=(await qr_repository.ensure(ids[1]))!;
    assert.notEqual(first.qr_token,draft.qr_token);assert.equal(await qr_repository.resolve(draft.qr_token),undefined);
    assert.equal(await qr_repository.resolve('0'.repeat(32)),undefined);
    const tx=new sql.Transaction(pool);await tx.begin();
    try{
      await assert.rejects(new sql.Request(tx).input('id',sql.VarChar(36),ids[1]).input('token',sql.VarChar(128),first.qr_token).query('UPDATE dbo.poi_qr_codes SET qr_token=@token WHERE poi_id=@id'));
    }finally{await tx.rollback();}
  }finally{
    for(const id of ids)await pool.request().input('id',sql.VarChar(36),id).query('DELETE FROM dbo.poi_qr_codes WHERE poi_id=@id; DELETE FROM dbo.pois WHERE id=@id');
    await close_pool();
  }
});
