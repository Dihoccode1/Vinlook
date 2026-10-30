import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { poi_repository, type PoiRepository } from './modules/pois/poi.repository.js';
import { admin_routes } from './modules/admin/admin.routes.js';
import {qr_repository,type QrRepository} from './modules/pois/qr.repository.js';

const query_schema = z.object({
  q: z.string().trim().max(200).default(''),
  category: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export function create_app(repository: PoiRepository = poi_repository, qr:QrRepository=qr_repository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/admin', admin_routes());
  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'poi-service' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await repository.ready();
      res.json({ status: 'ok', service: 'poi-service' });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'poi-service' });
    }
  });
  app.get('/pois', async (req, res) => {
    const query = query_schema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid search or pagination parameters' } });
      return;
    }
    res.json(await repository.list(query.data));
  });
  app.get('/pois/qr/:token',async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const token=String(req.params.token);
    if(!/^[a-f0-9]{32}$/.test(token)){res.status(400).json({error:{message:'Mã QR không hợp lệ.'}});return;}
    const id=await qr.resolve(token);
    const poi=id?await repository.find(id):undefined;
    if(!poi){res.status(404).json({error:{message:'Địa điểm không tồn tại hoặc chưa được xuất bản.'}});return;}
    res.json({data:poi});
  });
  app.get('/pois/:id/image', async (req, res) => {
    const id = z.string().regex(/^POI[0-9]{3,20}$/).safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'POI id must be a UUID' } });
      return;
    }
    const image = await repository.find_image(id.data);
    if (!image) {
      res.status(404).json({ error: { code: 'IMAGE_NOT_FOUND', message: 'POI image not found' } });
      return;
    }
    res.set({
      'content-Type': image.content_type,
      'Cache-Control': 'public, max-age=300',
      ETag: `"${image.sha256}"`,
    }).send(image.content);
  });
  app.get('/pois/:id', async (req, res) => {
    const id = z.string().regex(/^POI[0-9]{3,20}$/).safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'POI id must be a UUID' } });
      return;
    }
    const poi = await repository.find(id.data);
    if (!poi) {
      res.status(404).json({ error: { code: 'POI_NOT_FOUND', message: 'POI not found' } });
      return;
    }
    res.json({ data: poi });
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error('POI request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'POI service is temporarily unavailable' } });
  };
  app.use(errors);
  return app;
}
