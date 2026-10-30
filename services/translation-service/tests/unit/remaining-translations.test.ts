import test from 'node:test';
import assert from 'node:assert/strict';
import { ben_thanh_translations } from '../../src/content/ben-thanh-translations.js';
import { palace_translations } from '../../src/content/palace-translations.js';
import { supports_language } from '../../src/modules/languages/languages.js';

test('remaining 20 translations preserve five complete paragraphs and supported language codes', () => {
  assert.equal(Object.keys(ben_thanh_translations.translations).length, 7);
  assert.equal(Object.keys(palace_translations.translations).length, 13);
  for (const set of [ben_thanh_translations, palace_translations]) {
    assert.match(set.source_hash, /^[a-f0-9]{64}$/);
    for (const [language, text] of Object.entries(set.translations)) {
      assert.ok(supports_language(language));
      assert.ok(text.name.trim().length > 0 && text.name.length <= 2000);
      assert.equal(text.description.split('\n\n').length, 5, `${set.slug}: ${language}`);
      assert.ok(text.description.length > 300 && text.description.length <= 20000);
      assert.ok(text.description.split('\n\n').every(paragraph => paragraph.trim().length > 40));
    }
  }
});
