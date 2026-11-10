/**
 * @file vite.config.ts
 * @description Cấu hình Vite dev server và reverse proxy cho ứng dụng du khách User Web (cổng 5173).
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${env.GATEWAY_PORT || 4000}` },
    },
  };
});
