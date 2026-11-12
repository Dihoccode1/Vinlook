/** All four APIs share one Node process to fit Render Free's memory budget. */
import { once } from 'node:events';
import { read_port } from '@vinlook/server/runtime';
import { query, close_postgres } from '@vinlook/server/postgres';
import { migrate } from './cloud-migrate.mjs';

export async function start_cloud() {
  if (!process.env.DATABASE_URL || !process.env.VINLOOK_DATASET_ID || !process.env.ADMIN_API_KEY)
    throw new Error('Cloud database, dataset identity and admin key must be configured');
  await migrate();
  const dataset = (await query('SELECT dataset_id FROM deployment_state WHERE id=1')).rows[0];
  if (dataset?.dataset_id !== process.env.VINLOOK_DATASET_ID)
    throw new Error(
      'Database identity mismatch. Restore/import the correct dataset before serving traffic.',
    );
  const internal = { poi: 4001, navigation: 4002, translation: 4003 };
  process.env.POI_SERVICE_URL = 'http://127.0.0.1:4001';
  process.env.NAVIGATION_SERVICE_URL = 'http://127.0.0.1:4002';
  process.env.TRANSLATION_SERVICE_URL = 'http://127.0.0.1:4003';
  process.env.VINLOOK_RELEASE_SHA =
    process.env.RENDER_GIT_COMMIT || process.env.VINLOOK_RELEASE_SHA || 'local';
  const servers = [];
  async function listen(app, port, host) {
    const server = app.listen(port, host);
    servers.push(server);
    await once(server, 'listening');
    return server;
  }
  try {
    for (const [service, port] of Object.entries(internal)) {
      const { create_app } = await import(`../services/${service}-service/dist/app.js`);
      await listen(create_app(), port, '127.0.0.1');
    }
    const { create_app } = await import('../services/api-gateway/dist/app.js');
    const app = create_app();
    // Public endpoint deliberately exposes only code revision, never dataset IDs or credentials.
    // Gateway has a final 404 handler, so mount the release route on a wrapper first.
    const { default: express } = await import('express');
    const publicApp = express();
    publicApp.disable('x-powered-by');
    publicApp.get('/health/release', (_req, res) =>
      res.set('Cache-Control', 'no-store').json({ revision: process.env.VINLOOK_RELEASE_SHA }),
    );
    publicApp.use(app);
    await listen(publicApp, read_port(process.env.PORT, 10000), '0.0.0.0');
    console.log(`Vinlook cloud ready: ${process.env.VINLOOK_RELEASE_SHA}`);
  } catch (error) {
    for (const server of servers) server.close();
    await close_postgres();
    throw error;
  }
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    await Promise.all(
      servers.map(
        (server) =>
          new Promise((resolve) => {
            server.close(resolve);
            server.closeIdleConnections();
          }),
      ),
    );
    await close_postgres();
    clearTimeout(deadline);
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return { stop };
}
if (
  process.argv[1] === new URL(import.meta.url).pathname ||
  process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/cloud-start.mjs')
) {
  start_cloud().catch(async (error) => {
    console.error(error.message);
    await close_postgres();
    process.exitCode = 1;
  });
}
