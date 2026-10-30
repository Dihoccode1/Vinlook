import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return { envDir: '../..', plugins: [react()], server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: {
    '/api/admin': { target: `http://127.0.0.1:${env.GATEWAY_PORT || 4000}` },
    '/api': `http://127.0.0.1:${env.GATEWAY_PORT || 4000}`,
  } } };
});
