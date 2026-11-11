/** Read-only acceptance checks. Never calls translation/TTS providers or changes data. */
const base = new URL(process.argv[2]);
const endpoints = ['/health/ready', '/api/pois?limit=1', '/api/languages'];
for (const endpoint of endpoints) {
  const response = await fetch(new URL(endpoint, base), { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  const body = await response.json();
  if (endpoint === '/health/ready' && body.status !== 'ok') throw new Error('Backend is not ready');
  if (endpoint !== '/health/ready' && !Array.isArray(body.data))
    throw new Error(`${endpoint}: invalid JSON payload`);
  console.log(`PASS ${endpoint}`);
}
