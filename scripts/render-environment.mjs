/** Only explicitly configured values are updated on an existing service. */
export function render_environment(env, creating = false) {
  const defaults = creating
    ? { SUPABASE_STORAGE_BUCKET: 'vinlook-media', TRANSLATION_PROVIDERS: 'mymemory' }
    : {};
  return [
    'DATABASE_URL',
    'VINLOOK_DATASET_ID',
    'ADMIN_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_STORAGE_BUCKET',
    'TRANSLATION_PROVIDERS',
    'GEMINI_API_KEY',
    'TTS_PROVIDERS',
  ].flatMap((key) => {
    const value = env[key] || defaults[key];
    return value ? [{ key, value }] : [];
  });
}
