import { Router, json, type ErrorRequestHandler } from 'express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { adminRepository, type AdminRepository } from './admin.repository.js';
import { adminPoiSchema, adminQuerySchema, decodeAdminImage } from './admin.schema.js';
import { lookupAddress, type AddressLookup } from './geocode.js';

export function adminRoutes(repository: AdminRepository = adminRepository, key = process.env.ADMIN_API_KEY, geocode: AddressLookup = lookupAddress) {
  const router = Router();
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const received = req.get('x-admin-key') ?? '';
    if (!key) { res.status(503).json({ error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Admin API is not configured' } }); return; }
    if (Buffer.byteLength(key) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(key), Buffer.from(received))) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }); return; }
    next();
  });
  router.use(json({ limit: '8mb' }));
  router.get('/geocode', async (req, res) => {
    const query = z.string().trim().min(5).max(500).safeParse(req.query.q);
    if (!query.success) { res.status(400).json({ error: { code: 'INVALID_ADDRESS', message: 'Nhập địa chỉ cụ thể từ 5 đến 500 ký tự.' } }); return; }
    try { res.json({ data: await geocode(query.data) }); }
    catch (error) {
      res.status(503).json({ error: { code: 'GEOCODE_UNAVAILABLE', message: error instanceof Error && error.message === 'GEOCODE_BUSY' ? 'Đang tra cứu địa chỉ khác. Sau vài giây, vào lại ô địa chỉ rồi rời ô để tự tìm lại.' : 'Chưa tra cứu được địa chỉ. Vào lại ô địa chỉ rồi rời ô để tự thử lại, hoặc nhập tọa độ bằng tay.' } });
    }
  });
  router.get('/stats', async (_req, res) => res.json({ data: await repository.stats() }));
  router.get('/pois', async (req, res) => {
    const query = adminQuerySchema.safeParse(req.query);
    if (!query.success) { res.status(400).json({ error: { code: 'INVALID_QUERY' } }); return; }
    res.json(await repository.list(query.data));
  });
  router.get('/pois/:id', async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    if (!id.success) { res.status(400).json({ error: { code: 'INVALID_ID' } }); return; }
    const poi = await repository.find(id.data);
    if (!poi) { res.status(404).json({ error: { code: 'POI_NOT_FOUND' } }); return; }
    res.json({ data: poi });
  });
  router.post('/pois', async (req, res) => {
    const input = adminPoiSchema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: { code: 'INVALID_POI', message: 'Kiểm tra lại thông tin địa điểm.' } }); return; }
    decodeAdminImage(input.data);
    const id = randomUUID(); const actor = z.string().uuid().safeParse(req.get('x-admin-user-id'));
    await repository.save(id, input.data, true, actor.success ? actor.data : undefined);
    res.status(201).json({ data: await repository.find(id) });
  });
  router.put('/pois/:id', async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id); const input = adminPoiSchema.safeParse(req.body);
    if (!id.success || !input.success || !input.data.updatedAt) { res.status(400).json({ error: { code: 'INVALID_POI', message: 'Kiểm tra lại thông tin và phiên bản địa điểm.' } }); return; }
    decodeAdminImage(input.data);
    const actor = z.string().uuid().safeParse(req.get('x-admin-user-id'));
    if (!await repository.save(id.data, input.data, false, actor.success ? actor.data : undefined)) { res.status(409).json({ error: { code: 'POI_CHANGED', message: 'Dữ liệu đã thay đổi. Hãy tải lại trước khi sửa.' } }); return; }
    res.json({ data: await repository.find(id.data) });
  });
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    const duplicate = [2601,2627].includes(error?.number);
    const invalid = ['INVALID_IMAGE','IMAGE_CREDIT_REQUIRED'].includes(error?.message);
    const status = duplicate ? 409 : invalid || error?.type === 'entity.parse.failed' ? 400 : error?.type === 'entity.too.large' ? 413 : 503;
    res.status(status).json({ error: { code: duplicate ? 'SLUG_EXISTS' : invalid ? error.message : 'ADMIN_REQUEST_FAILED', message: duplicate ? 'Đường dẫn địa điểm đã tồn tại.' : invalid ? 'Ảnh không hợp lệ hoặc thiếu tác giả.' : 'Không thể xử lý yêu cầu quản trị.' } });
  };
  router.use(errors); return router;
}
