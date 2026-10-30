import {Router} from 'express';
import {qr_repository,type QrRepository} from '../pois/qr.repository.js';
export function qr_routes(repository:QrRepository=qr_repository){
  const router=Router();
  router.post('/pois/:id/qr',async(req,res)=>{
    const id=String(req.params.id);
    if(!/^POI[0-9]{3,20}$/.test(id)){res.status(400).json({error:{message:'Mã địa điểm không hợp lệ.'}});return;}
    const qr=await repository.ensure(id);
    if(!qr){res.status(404).json({error:{message:'Không tìm thấy địa điểm.'}});return;}
    res.json({data:{...qr,qr_path:`/qr/${qr.qr_token}`}});
  });
  return router;
}
