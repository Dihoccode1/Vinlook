import { useState, useEffect } from 'react';
import { api } from '../../services/api';
export function useUsernameAvailability(
  checking_username: boolean,
  username: string,
  busy: boolean,
) {
  const [username_check, set_username_check] = useState<
    'available' | 'taken' | 'unavailable' | null
  >(null);
  useEffect(() => {
    if (!checking_username || busy) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await api<{ data: { available: boolean } }>(
          `/users/availability?${new URLSearchParams({ username: username })}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          set_username_check(result.data.available ? 'available' : 'taken');
        }
      } catch {
        if (!controller.signal.aborted) set_username_check('unavailable');
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checking_username, username, busy]);

  return { username_check, set_username_check };
}
