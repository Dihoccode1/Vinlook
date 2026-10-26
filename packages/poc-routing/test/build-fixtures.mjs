// Synthetic OSM-shaped inputs only. No real extract, public POI, media or coverage claim.
export const importLimits = { nodes: 100, ways: 100, relations: 100, edges: 1000, tags: 30, wayRefs: 100, relationMembers: 100, totalRefs: 10000 };
export const csrLimits = { nodes: 100, edges: 1000, bytes: 100000, metadataBytes: 100000 };
export const coreLimits = { nodes: 100, edges: 1000, indexEntries: 10000, snapCandidates: 1000, queryEdges: 10000, searchSettled: 1000 };
export const indexLimits = { entries: 10000, cells: 10000 };
export function osmFixture() {
  return { complete: true, nodes: [
    [1,106.7,10.7], [2,106.701,10.7], [3,106.702,10.7], [4,106.701,10.7], [5,106.701,10.701], [6,107,11], [7,107.001,11],
  ].map(([id,lon,lat]) => ({ id: String(id), lon, lat })), ways: [
    { id: '10', nodes: ['1','2','3'], tags: { highway: 'residential', foot: 'yes', oneway: 'yes', name: 'Synthetic Nguyễn Du' } },
    { id: '11', nodes: ['4','5'], tags: { highway: 'footway', foot: 'yes', bridge: 'yes', layer: '1' } },
    { id: '12', nodes: ['6','7'], tags: { highway: 'path', foot: 'yes' } },
  ], relations: [] };
}

export function packageInputs() {
  // Structurally OSM/public-shaped synthetic data, not an extract or published content.
  const bytes = new Map(), entries = [];
  const add = (id, kind) => { const content = new TextEncoder().encode(`SYNTHETIC-NOT-PRODUCTION:${id}`); bytes.set(id, content); entries.push({ id, kind, url: `/offline/synthetic-v1/${id}.bin` }); };
  for (const kind of ['shell','style','glyphs','sprite','pmtiles','boundary','graph','spatial-index','poi']) add(kind, kind);
  const publishedPois = Array.from({ length: 15 }, (_, index) => ({ id: String(index + 1).padStart(24, '0'), revisionId: String(index + 101).padStart(24, '0'),
    nameEN: `Synthetic ${index}`, location: { type: 'Point', coordinates: [106.7,10.7] }, entrance: { type: 'Point', coordinates: [106.7,10.7] },
    thumbnail: { url: `https://assets.example.invalid/${index}.jpg` }, languageCode: 'en', text: `Synthetic narration ${index}`,
    audio: { url: `https://assets.example.invalid/${index}.mp3`, durationSeconds: 120 } }));
  const pois = publishedPois.map((poi, index) => { add(`thumbnail-${index}`, 'thumbnail'); add(`audio-${index}`, 'audio');
    return { id: poi.id, revisionId: poi.revisionId, entrance: poi.entrance.coordinates, englishText: poi.text, thumbnailFileId: `thumbnail-${index}`, audioFileId: `audio-${index}` }; });
  return { bytes, entries, base: { schemaVersion: 1, packageVersion: 'synthetic-v1', createdAt: '2026-10-26T00:00:00.000Z', language: 'en',
    appCompatibility: { minBuild: 1, maxBuild: 1 }, coverageVersion: 'synthetic-no-real-coverage', boundaryFileId: 'boundary',
    graph: { graphVersion: 'synthetic-graph', schemaVersion: 1, format: 'vinlook-csr-v1', profileVersion: 'synthetic', chunkFileIds: ['graph'], spatialIndexFileId: 'spatial-index' },
    provenance: { kind: 'osm', sourceSnapshot: 'https://source.example.invalid/synthetic.osm.pbf', license: 'ODbL-1.0', attribution: 'Synthetic metadata for validation only; no real extract' }, pois },
    options: { publishedPois, appBuild: 1, limits: { files: 100, fileBytes: 10000, totalBytes: 100000 }, loadFile: id => bytes.get(id) } };
}
