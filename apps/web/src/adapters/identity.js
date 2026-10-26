import { ApiError, createTransport } from './http.js';

// This closure is the only token store. Reload/logout drops it; no storage writes.
export function createIdentityAdapter(origin, options) {
  const request = createTransport(origin, options);
  let token = null;
  const account = (value) => {
    if (
      !value ||
      !['Staff', 'Manager'].includes(value.role) ||
      value.status !== 'active' ||
      typeof value.id !== 'string'
    ) {
      throw new ApiError('INVALID_RESPONSE');
    }
    return {
      id: value.id,
      fullName: value.fullName,
      email: value.email,
      role: value.role,
      status: value.status,
    };
  };
  return {
    async login(email, password, { signal } = {}) {
      token = null;
      const data = await request('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
        signal,
      });
      const current = account(data?.account);
      if (typeof data.accessToken !== 'string' || !data.accessToken || data.expiresIn !== 7200)
        throw new ApiError('INVALID_RESPONSE');
      token = data.accessToken;
      return current;
    },
    async me({ signal } = {}) {
      if (!token) throw new ApiError('AUTHENTICATION_REQUIRED', { status: 401 });
      try {
        const data = await request('/api/v1/me', { token, signal });
        return { account: account(data?.account), currentWorkSession: data.currentWorkSession };
      } catch (error) {
        if ([401, 403].includes(error.status)) token = null;
        throw error;
      }
    },
    logout() {
      token = null;
    },
  };
}
