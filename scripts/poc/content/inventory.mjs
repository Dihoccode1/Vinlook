import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const text = (root, path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const groups = [[1, 5], [6, 10], [11, 15]];

export function registryAt(root = repositoryRoot) {
  const path = 'services/content/src/adapters/hybrid-v1.json', source = text(root, path);
  const registry = JSON.parse(source), locales = Object.keys(registry.profiles).sort();
  if (locales.length !== 16 || !locales.includes('en') || !locales.includes('zh-Hant')) throw new Error('REGISTRY_INVENTORY_INVALID');
  return { ...registry, path, documentSha256LF: sha256(source), locales };
}

export function extractNarrations(source, expectedStart, expectedEnd) {
  const normalized = source.replace(/\r\n/g, '\n');
  const headings = [...normalized.matchAll(/^## (POI-\d{3}) — (.+)$/gm)];
  if (headings.length !== expectedEnd - expectedStart + 1) throw new Error('NARRATION_INVENTORY_INVALID');
  return headings.map((heading, index) => {
    const poiRef = `POI-${String(expectedStart + index).padStart(3, '0')}`;
    const section = normalized.slice(heading.index, headings[index + 1]?.index ?? normalized.length);
    const narration = section.match(/^### Narration EN\s*\n([\s\S]*?)^### Editorial metadata[^\n]*/m)?.[1].trim();
    const name = section.match(/^English name: (.+)$/m)?.[1].replace(/\*/g, '').replace(/\.$/, '').trim();
    if (heading[1] !== poiRef || !narration || !name) throw new Error('NARRATION_INVENTORY_INVALID');
    return { poiRef, nameEN: name, narrationSha256: sha256(narration), words: narration.split(/\s+/).length };
  });
}

/** Repo evidence only: no live IDs/versions, human approvals or media rights are inferred. */
export function buildInventory(root = repositoryRoot) {
  const registry = registryAt(root), pois = [];
  const geography = 'docs/content/poi-001-015-geography-review.md';
  const geographyAttribution = 'docs/content/poi-001-015-geography-attribution.md';
  const geographyHash = sha256(text(root, geography)), attributionHash = sha256(text(root, geographyAttribution));
  for (const [start, end] of groups) {
    const range = `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`;
    const path = `docs/content/poi-${range}-scripts-en.md`, review = `docs/content/poi-${range}-source-review.md`;
    const source = text(root, path);
    for (const item of extractNarrations(source, start, end)) {
      pois.push({ ...item, sourceFile: path, sourceDocumentSha256LF: sha256(source),
        sourceReviewFile: review, sourceReviewSha256LF: sha256(text(root, review)),
        repositoryEditorialStatement: start === 1 ? 'editorial_source_accepted_audio_review_pending' : 'draft_pending_human_review_in_document',
        entranceEvidence: { file: geography, documentSha256LF: geographyHash, status: 'desktop_proposal_not_revalidated', fieldwork: 'waived_not_performed' },
        attributionEvidence: { file: geographyAttribution, documentSha256LF: attributionHash },
        thumbnail: { license: null, provenance: null, status: 'not_verified' } });
    }
  }
  const rows = pois.flatMap(poi => registry.locales.map(languageCode => ({ poiRef: poi.poiRef, languageCode,
    translationModel: languageCode === 'en' ? null : registry.translationModel,
    audioProfile: registry.profiles[languageCode].id, execution: registry.profiles[languageCode].execution,
    liveVerification: 'not_checked', textVersion: null, audioSha256: null, durationSeconds: null,
    historicalApprovalReported: poi.poiRef === 'POI-001' && ['en', 'vi', 'zh-Hant'].includes(languageCode) })));
  return { schemaVersion: 1, evidenceMode: 'repository_only_not_live_acceptance',
    registry: { path: registry.path, version: registry.registryVersion, documentSha256LF: registry.documentSha256LF, locales: registry.locales },
    summary: { pois: pois.length, pairs: rows.length, historicalApprovalReports: 3, livePairsVerifiedByThisInventory: 0,
      translationTasksIfAllMissing: rows.filter(row => row.translationModel !== null).length,
      serverAudioTasksIfAllMissing: rows.filter(row => row.execution === 'server_adapter').length,
      localAudioTasksIfAllMissing: rows.filter(row => row.execution === 'local_worker').length },
    historicalReport: { source: 'https://github.com/Dihoccode1/Vinlook/issues/73', poiRef: 'POI-001',
      sourceVersionReported: 1, localesReportedApproved: ['en', 'vi', 'zh-Hant'],
      disposition: 'preserve_and_revalidate_privately_before_any_action_not_current_acceptance' },
    unresolved: ['LIVE_STATE_NOT_READ', 'THUMBNAIL_LICENSE_NOT_VERIFIED', 'ARRIVAL_ACCEPTANCE_NOT_REVALIDATED', 'LOCALE_HUMAN_REVIEW_NOT_REVALIDATED'],
    pois, rows };
}

export function inventoryJson(root = repositoryRoot) {
  const value = buildInventory(root), { rows, ...metadata } = value;
  return `${JSON.stringify({ ...metadata, rows: [] }, null, 2).replace('"rows": []', `"rows": [\n${rows.map(row => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]`)}\n`;
}
