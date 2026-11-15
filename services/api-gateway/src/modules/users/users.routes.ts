import { Router, json, type RequestHandler, type ErrorRequestHandler } from 'express';
import { valid_username, validate_user } from './users.schema.js';
import { UserError, hash_password, type UserRepository } from './users.service.js';
export function username_availability(
  is_taken: (username: string) => Promise<boolean>,
): RequestHandler {
  return async (req, res) => {
    const { username } = req.query;
    if (!valid_username(username)) {
      res.status(400).json({ error: { message: 'Tên tài khoản không hợp lệ.' } });
      return;
    }
    const available = username.toLowerCase() !== 'admin' && !(await is_taken(username));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { available } });
  };
}

export function create_user_routes(repository: UserRepository) {
  const router = Router();
  router.use((_req, res, next) => {
    if (res.locals.adminUser?.role !== 'admin') {
      res.status(403).json({ error: { message: 'Chỉ Admin được quản lý tài khoản.' } });
      return;
    }
    next();
  });
  router.get('/', async (_req, res) => {
    res.json({ data: await repository.list() });
  });
  router.get('/availability', username_availability(repository.is_taken));
  router.use(json({ limit: '4kb' }));
  router.patch('/:id/status', async (req, res) => {
    const id = repository.normalize(String(req.params.id)),
      status = req.body?.status;
    if (!/^USR[0-9]{3,20}$/i.test(id) || !['active', 'disabled'].includes(status))
      throw new UserError(400, 'Trạng thái tài khoản không hợp lệ.');
    await repository.change_status(
      id,
      status,
      repository.normalize(String(res.locals.adminUser.id)),
    );
    res.json({ data: { id, status } });
  });
  const save: RequestHandler = async (req, res) => {
    const creating = req.method === 'POST',
      input = validate_user(req.body, creating);
    const id = creating ? null : repository.normalize(String(req.params.id));
    if (!input || (id && !/^USR[0-9]{3,20}$/i.test(id)))
      throw new UserError(400, repository.invalid_input_message);
    const actor = repository.normalize(String(res.locals.adminUser.id));
    if (id === actor && input.role !== 'admin')
      throw new UserError(409, 'Bạn không thể hạ quyền tài khoản đang sử dụng.');
    const saved = await repository.save(id, input, actor, await hash_password(input.password));
    res.status(creating ? 201 : 200).json({ data: { id: saved } });
  };
  router.post('/', save);
  router.put('/:id', save);
  router.use(((error, _req, res, next) => {
    if (error instanceof UserError) {
      res.status(error.status).json({ error: { message: error.message } });
      return;
    }
    if (error?.code === '23505' || error?.number === 2601 || error?.number === 2627) {
      res.status(409).json({ error: { message: 'Tên tài khoản đã được sử dụng.' } });
      return;
    }
    next(error);
  }) as ErrorRequestHandler);
  return router;
}
