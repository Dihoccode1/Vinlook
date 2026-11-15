export const valid_username = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9_.-]{3,100}$/.test(value);

export interface UserInput {
  username: string;
  full_name: string;
  role: 'admin' | 'staff';
  status: 'active' | 'disabled';
  password?: string;
}
export function validate_user(body: unknown, creating: boolean): UserInput | undefined {
  if (!body || typeof body !== 'object') return;
  const b = body as Record<string, unknown>;
  if (
    !valid_username(b.username) ||
    typeof b.full_name !== 'string' ||
    !b.full_name.trim() ||
    b.full_name.trim().length > 200 ||
    !['admin', 'staff'].includes(String(b.role)) ||
    !['active', 'disabled'].includes(String(b.status))
  )
    return;
  if (
    (creating || b.password !== undefined) &&
    (typeof b.password !== 'string' || b.password.length < 5 || b.password.length > 200)
  )
    return;
  return {
    username: b.username,
    full_name: b.full_name.trim(),
    role: b.role as UserInput['role'],
    status: b.status as UserInput['status'],
    ...(typeof b.password === 'string' ? { password: b.password } : {}),
  };
}
