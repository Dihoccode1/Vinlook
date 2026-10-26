import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export default defineConfig(({command, mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_POC_FIXTURE');
  if (command === 'build' && env.VITE_POC_FIXTURE) throw new Error('FIXTURE_FORBIDDEN');
  const release=JSON.parse(readFileSync(new URL('../../data/poc/routing-release.json',import.meta.url),'utf8'));
  let hosted=null;try{const base=new URL(`./public/routing/${release.graphVersion}/`,import.meta.url),prepared=JSON.parse(readFileSync(new URL('.prepared.json',base),'utf8'));
   if(prepared.manifestSha256===release.manifestSha256&&createHash('sha256').update(readFileSync(new URL('manifest.json',base))).digest('hex')===release.manifestSha256)
    hosted={graphVersion:release.graphVersion,manifestSha256:release.manifestSha256,manifestPath:`/routing/${release.graphVersion}/manifest.json`};
  }catch{/* Ordinary local/CI builds stay unconfigured; Vercel's preparation step must succeed first. */}
  return {define:{__VINLOOK_HOSTED_ROUTING__:JSON.stringify(hosted)},plugins: [react(), tailwindcss()], resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } }, server: { host: '127.0.0.1', strictPort: true }};
});
