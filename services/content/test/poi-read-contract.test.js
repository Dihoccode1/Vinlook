import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPoiReadRepository } from '../src/modules/pois/poi.repository.js';
import { draftReadDto } from '../src/modules/pois/poi.dto.js';

test('POI read repository restricts revisions to their POI and preserves locale ordering', async () => {
  const calls = [];
  const repository = createPoiReadRepository({
    POIRevision: {
      findOne(filter) {
        calls.push(filter);
        return Promise.resolve(null);
      },
    },
    LocalizedContent: {
      find(filter) {
        calls.push(filter);
        return {
          sort(order) {
            calls.push(order);
            return Promise.resolve([]);
          },
        };
      },
    },
  });
  await repository.findPublishedRevision('poi-id', 'published-id');
  await repository.findWorkingRevision('poi-id');
  await repository.findLocalizedContents('revision-id');
  assert.deepEqual(calls, [
    { _id: 'published-id', poiId: 'poi-id', status: 'published' },
    { poiId: 'poi-id', status: { $in: ['draft', 'in_review'] } },
    { revisionId: 'revision-id' },
    { languageCode: 1 },
  ]);
});
test('POI read DTO preserves identifiers and current/stale source and audio flags', () => {
  const document = (fields) => ({ ...fields, toObject: () => fields });
  const revision = document({ _id: 'revision-id', sourceVersion: 2 });
  const rows = [
    document({
      _id: 'a',
      languageCode: 'en',
      sourceVersion: 2,
      textVersion: 3,
      audioAsset: { textVersion: 3 },
    }),
    document({
      _id: 'b',
      languageCode: 'vi',
      sourceVersion: 1,
      textVersion: 3,
      audioAsset: { textVersion: 3 },
    }),
    document({
      _id: 'c',
      languageCode: 'fr',
      sourceVersion: 2,
      textVersion: 4,
      audioAsset: { textVersion: 3 },
    }),
    document({ _id: 'd', languageCode: 'de', sourceVersion: 2, textVersion: 1, audioAsset: null }),
  ];
  const result = draftReadDto({
    poi: document({ _id: 'poi-id' }),
    published: null,
    working: revision,
    revision,
    rows,
  });
  assert.equal(result.poi.id, 'poi-id');
  assert.equal(result.publishedRevision, null);
  assert.equal(result.workingRevision.id, 'revision-id');
  assert.deepEqual(
    result.localizedContents.map((row) => [row.id, row.isSourceCurrent, row.isAudioCurrent]),
    [
      ['a', true, true],
      ['b', false, false],
      ['c', true, false],
      ['d', true, false],
    ],
  );
  assert.equal(Object.hasOwn(result.poi, '_id'), false);
  assert.deepEqual(
    draftReadDto({
      poi: document({ _id: 'p' }),
      published: null,
      working: null,
      revision: null,
      rows: [],
    }).localizedContents,
    [],
  );
});
