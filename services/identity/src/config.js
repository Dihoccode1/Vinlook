import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  HOST: z.string().trim().min(1),
  PORT: z.string().regex(/^[0-9]+$/).transform(Number).pipe(z.number().int().min(1).max(65535)),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.HOST !== '0.0.0.0') {
    context.addIssue({ code: 'custom', path: ['HOST'], message: 'Invalid production host' });
  }
});

export class ConfigurationError extends Error {
  constructor(fields) {
    super(`Invalid runtime configuration: ${fields.join(', ')}`);
    this.name = 'ConfigurationError';
    this.code = 'INVALID_RUNTIME_CONFIG';
    this.fields = fields;
  }
}

/** Return only consumed, nonsecret settings. Never retain process.env or Zod input/errors. */
export function loadConfig(environment = process.env) {
  const mode = environment.NODE_ENV ?? 'development';
  const production = mode === 'production';
  const parsed = schema.safeParse({
    NODE_ENV: mode,
    HOST: environment.HOST ?? (production ? undefined : '127.0.0.1'),
    PORT: environment.PORT ?? (production ? undefined : '3001'),
  });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map(issue => String(issue.path[0])))].sort();
    throw new ConfigurationError(fields);
  }
  return Object.freeze({ mode: parsed.data.NODE_ENV, host: parsed.data.HOST, port: parsed.data.PORT });
}
