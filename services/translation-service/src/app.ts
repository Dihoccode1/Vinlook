import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { languages, supportsLanguage } from './modules/languages/languages.js';
import { createTranslationService } from './modules/translations/translation.service.js';
import { translationRepository } from './modules/translations/translation.repository.js';
import { TranslationError } from './modules/translations/types.js';
import { createPoiSource } from './providers/poi-source.js';
import { createTranslationProvider } from './providers/translation-provider.js';
import { createTtsProvider } from './providers/tts-provider.js';
import { createNarrationService } from './modules/translations/narration.service.js';
import { narrationRepository } from './modules/translations/narration.repository.js';
import { createNarrationFileStore } from './modules/translations/narration-files.js';

export function createApp(service = createTranslationService(createPoiSource(), translationRepository, createTranslationProvider()), narration = createNarrationService(service, createTtsProvider(), narrationRepository, createNarrationFileStore())) {
  const app = express();
  app.disable('x-powered-by'); app.use(helmet()); app.use(express.json({ limit: '1kb' }));
  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'translation-service' }));
  app.get('/health/ready', async (_req, res) => {
    try { await service.ready(); res.json({ status: 'ok', service: 'translation-service' }); }
    catch { res.status(503).json({ status: 'unavailable', service: 'translation-service' }); }
  });
  app.get('/languages', (_req, res) => res.json({ data: languages }));
  app.post('/pois/:id/narration', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = z.string().uuid().safeParse(req.params.id);
    const body = z.object({ language: z.string().refine(supportsLanguage) }).strict().safeParse(req.body);
    if (!id.success || !body.success) { res.status(400).json({ error: { code: 'INVALID_NARRATION_REQUEST' } }); return; }
    res.type('audio/wav').send(await narration.get(id.data, body.data.language));
  });
  app.post('/pois/:id/translation', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = z.string().uuid().safeParse(req.params.id);
    const body = z.object({ language: z.string().refine(supportsLanguage) }).strict().safeParse(req.body);
    if (!id.success || !body.success) { res.status(400).json({ error: { code: 'INVALID_TRANSLATION_REQUEST', message: 'Provide a POI UUID and supported language' } }); return; }
    res.json(await service.get(id.data, body.data.language));
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof TranslationError) {
      const statuses: Record<TranslationError['code'], number> = { PROVIDER_BUSY: 503, PROVIDER_NOT_CONFIGURED: 503, POI_NOT_FOUND: 404, SOURCE_UNAVAILABLE: 502, UNSUPPORTED_LANGUAGE: 400, PROVIDER_UNAVAILABLE: 502, PROVIDER_QUOTA: 429, PROVIDER_TIMEOUT: 504 };
      res.status(statuses[error.code]).json({ error: { code: error.code, message: 'Unable to translate POI' } }); return;
    }
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 503;
    res.status(status).json({ error: { code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'INVALID_BODY', message: 'Translation service unavailable or invalid request' } });
  };
  app.use(errors); return app;
}
