import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({command, mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_POC_FIXTURE');
  if (command === 'build' && env.VITE_POC_FIXTURE) throw new Error('FIXTURE_FORBIDDEN');
  return {plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }, server: { host: '127.0.0.1', strictPort: true }};
});
