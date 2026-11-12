/** Private Supabase objects; credentials never leave the backend. */
function settings(path) {
  const origin = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!origin || !key) throw new Error('Supabase Storage is not configured');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co'))
    throw new Error('Invalid Supabase origin');
  url.pathname = `/storage/v1/object/${process.env.SUPABASE_STORAGE_BUCKET || 'vinlook-media'}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}
export async function read_object(path) {
  const { url, headers } = settings(path);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Storage read failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
export async function write_object(path, content, contentType) {
  const { url, headers } = settings(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': contentType, 'x-upsert': 'false' },
    body: content,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok && response.status !== 409)
    throw new Error(`Storage upload failed (${response.status})`);
  // Verify immutable content, including an already-existing object, before saving its reference.
  const saved = await read_object(path);
  if (!saved?.equals(content)) throw new Error('Storage content verification failed');
}
