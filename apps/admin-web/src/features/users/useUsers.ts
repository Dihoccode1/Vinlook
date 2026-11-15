import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';
export function useUsers(refresh: number, set_error: Dispatch<SetStateAction<string>>) {
  const [users, set_users] = useState<User[]>([]);
  const [loading, set_loading] = useState(true);
  // Tải danh sách người dùng từ API Gateway
  useEffect(() => {
    const controller = new AbortController();
    set_loading(true);
    set_error('');

    api<{ data: User[] }>('/users', { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted) set_users(r.data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) set_error(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });

    return () => controller.abort();
  }, [refresh, set_error]);

  return { users, set_users, loading };
}
