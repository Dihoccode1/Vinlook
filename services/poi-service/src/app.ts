import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { poiRepository, type PoiRepository } from './modules/pois/poi.repository.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

const querySchema = z.object({
  q: z.string().trim().max(200).default(''),
  category: z.string().trim().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export function createApp(repository: PoiRepository = poiRepository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/admin', adminRoutes());
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
    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: { code: 'INVALID_QUERY', message: 'Invalid search or pagination parameters' } });
      return;
    }
    res.json(await repository.list(query.data));
  });
  app.get('/pois/:id/image', async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'POI id must be a UUID' } });
      return;
    }
    const image = await repository.findImage(id.data);
    if (!image) {
      res.status(404).json({ error: { code: 'IMAGE_NOT_FOUND', message: 'POI image not found' } });
      return;
    }
    res.set({
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=300',
      ETag: `"${image.sha256}"`,
    }).send(image.content);
  });
  app.get('/pois/:id', async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
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
