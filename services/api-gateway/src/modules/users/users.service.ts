import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import type { UserInput } from './users.schema.js';

const derive = promisify(scrypt);
export class UserError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface UserRepository {
  normalize(id: string): string;
  invalid_input_message: string;
  list(): Promise<unknown[]>;
  is_taken(username: string): Promise<boolean>;
  change_status(id: string, status: string, actor: string): Promise<unknown>;
  save(id: string | null, input: UserInput, actor: string, hash: string | null): Promise<string>;
}

export async function hash_password(password?: string): Promise<string | null> {
  if (!password) return null;
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString('hex')}`;
}

export interface Account {
  id: string;
  username: string;
  role: string;
  status: string;
  login_locked: boolean;
}

/** Called inside the repository transaction after locking accounts in a stable order. */
export function account_context(users: Account[], actor: string, id: string | null) {
  const current = users.find((user) => user.id.toLowerCase() === actor.toLowerCase());
  if (current?.role !== 'admin' || current.status !== 'active' || current.login_locked)
    throw new UserError(403, 'Chỉ Admin được quản lý tài khoản.');
  const target = users.find((user) => user.id.toLowerCase() === id?.toLowerCase());
  if (id !== null && !target) throw new UserError(404, 'Tài khoản không tồn tại.');
  return { current, target };
}

export function assert_status_change(target: Account, status: string, actor: string) {
  if (target.username.toLowerCase() === 'admin' && status === 'disabled')
    throw new UserError(403, 'Không thể khóa tài khoản root admin.');
  if (
    target.login_locked &&
    (target.id.toLowerCase() === actor.toLowerCase() || status !== 'active')
  )
    throw new UserError(403, 'Tài khoản bị khóa do đăng nhập sai chỉ được Admin khác mở khóa.');
}

export function assert_user_change(
  current: Account,
  target: Account | undefined,
  input: UserInput,
) {
  const target_is_root = target?.username.toLowerCase() === 'admin';
  if (input.username.toLowerCase() === 'admin' && !target_is_root)
    throw new UserError(403, 'Tên admin dành riêng cho tài khoản Root.');
  if (
    target_is_root &&
    (input.status !== 'active' || input.role !== 'admin' || input.username !== target.username)
  )
    throw new UserError(
      403,
      'Tài khoản root admin không được khóa, đổi tên đăng nhập hoặc hạ quyền.',
    );
  if (
    target?.role === 'admin' &&
    target.id.toLowerCase() !== current.id.toLowerCase() &&
    current.username.toLowerCase() !== 'admin'
  )
    throw new UserError(403, 'Không được chỉnh sửa hoặc đổi mật khẩu tài khoản Admin khác.');
  if (target?.login_locked && input.status === 'active')
    throw new UserError(409, 'Vui lòng dùng nút Mở khóa để Admin khác mở lại tài khoản.');
}
