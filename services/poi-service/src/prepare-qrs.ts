import {get_pool,close_pool} from './config/database.js';
import {qr_repository} from './modules/pois/qr.repository.js';
try{
  const rows=(await (await get_pool()).request().query<{id:string}>('SELECT id FROM dbo.pois ORDER BY id')).recordset;
  for(const row of rows)await qr_repository.ensure(row.id);
  console.log(`QR codes ready for ${rows.length} POIs (existing tokens preserved).`);
}finally{await close_pool();}
