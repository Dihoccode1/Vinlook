import { Router } from 'express';

export function delivery_status_routes(fetcher: typeof fetch = fetch, now = Date.now) {
  const router = Router();
  type CI = { state: string; conclusion?: string | null; url?: string; updated_at?: string };
  let cached: { checked_at: string; ci: CI; cd: { state: string } } | undefined;
  let expires = 0;
  let pending: Promise<void> | undefined;
  async function update() {
    let ci: CI = { state: 'unknown' };
    try {
      const response = await fetcher('https://api.github.com/repos/Dihoccode1/Vinlook/actions/workflows/pull-request.yml/runs?branch=TEST&per_page=1', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Vinlook-monitor' },
        signal: AbortSignal.timeout(5000), redirect: 'error',
      });
      if (!response.ok) throw new Error('GitHub unavailable');
      const body = await response.json();
      if (!Array.isArray(body.workflow_runs)) throw new Error('Invalid response');
      const run = body.workflow_runs[0];
      ci = run ? { state: typeof run.status === 'string' ? run.status : 'unknown', conclusion: run.conclusion,
        url: typeof run.html_url === 'string' && run.html_url.startsWith('https://github.com/Dihoccode1/Vinlook/actions/runs/') ? run.html_url : undefined,
        updated_at: run.updated_at } : { state: 'no_runs' };
    } catch { /* Report unknown rather than showing an old success as current. */ }
    cached = { checked_at: new Date(now()).toISOString(), ci, cd: { state: 'not_configured' } };
    expires = now() + 60000;
  }
  // Mounted behind admin_auth; staff cannot access /monitor routes.
  router.get('/monitor/delivery', async (_req, res) => {
    if (!cached || now() >= expires) {
      pending ??= update().finally(() => { pending = undefined; });
      await pending;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: cached });
  });
  return router;
}
