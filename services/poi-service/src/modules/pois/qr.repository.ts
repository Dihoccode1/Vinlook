import {randomBytes} from 'node:crypto';
import sql from 'mssql';
import {get_pool} from '../../config/database.js';

export interface PoiQr {poi_id:string;qr_token:string;qr_image_url:string|null;created_at:Date;updated_at:Date}
export interface QrRepository {ensure(poi_id:string):Promise<PoiQr|undefined>;resolve(qr_token:string):Promise<string|undefined>}
export const qr_repository:QrRepository={
  async ensure(poi_id){
    const tx=new sql.Transaction(await get_pool());await tx.begin();
    try{
      const exists=await new sql.Request(tx).input('id',sql.VarChar(36),poi_id).query('SELECT id FROM dbo.pois WITH(UPDLOCK,HOLDLOCK) WHERE id=@id');
      if(!exists.recordset.length){await tx.commit();return undefined;}
      const result=await new sql.Request(tx).input('id',sql.VarChar(36),poi_id).input('token',sql.VarChar(128),randomBytes(16).toString('hex')).query<PoiQr>(`
        IF NOT EXISTS(SELECT 1 FROM dbo.poi_qr_codes WHERE poi_id=@id)
          INSERT INTO dbo.poi_qr_codes(poi_id,qr_token) VALUES(@id,@token);
        SELECT poi_id,qr_token,qr_image_url,created_at,updated_at FROM dbo.poi_qr_codes WHERE poi_id=@id;`);
      await tx.commit();return result.recordset[0];
    }catch(error){await tx.rollback();throw error;}
  },
  async resolve(qr_token){
    const result=await (await get_pool()).request().input('token',sql.VarChar(128),qr_token).query<{poi_id:string}>(`
      SELECT qr.poi_id FROM dbo.poi_qr_codes qr JOIN dbo.pois p ON p.id=qr.poi_id WHERE qr.qr_token=@token AND p.is_published=1`);
    return result.recordset[0]?.poi_id;
  },
};
