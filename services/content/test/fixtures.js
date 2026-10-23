import mongoose from 'mongoose';
export const point = () => ({ type: 'Point', coordinates: [106.7, 10.78] });
export const asset = () => ({ publicId: 'synthetic/asset-v1', url: 'https://media.example.invalid/synthetic/v1/asset.webp', format: 'webp' });
export const revision = (overrides = {}) => ({ poiId: new mongoose.Types.ObjectId(), revisionNumber: 1, editVersion: 0, sourceVersion: 1,
  status: 'draft', nameEN: 'Synthetic museum', location: point(), entrance: null, thumbnailAsset: null,
  sourceTextEN: 'Synthetic source text, not a verified tourism narration.', createdBy: new mongoose.Types.ObjectId(), ...overrides });
export const localized = (overrides = {}) => ({ revisionId: new mongoose.Types.ObjectId(), languageCode: 'en', sourceVersion: 1,
  textVersion: 1, reviewStatus: 'pending', ...overrides });
export const approved = (overrides = {}) => localized({ text: 'Synthetic localized narration.',
  audioAsset: { ...asset(), format: 'wav', url: 'https://media.example.invalid/synthetic/v1/audio.wav', textVersion: 1,
    registryVersion: 'fixture-registry-v1', voiceOrModelId: 'synthetic-model' }, durationSeconds: 120,
  reviewStatus: 'approved', reviewedBy: new mongoose.Types.ObjectId(), reviewedAt: new Date('2026-10-23T03:00:00Z'), ...overrides });
