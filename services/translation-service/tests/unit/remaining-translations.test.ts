import test from 'node:test';
import assert from 'node:assert/strict';
import { benThanhTranslations } from '../../src/content/ben-thanh-translations.js';
import { palaceTranslations } from '../../src/content/palace-translations.js';
import { supportsLanguage } from '../../src/modules/languages/languages.js';

test('remaining 20 translations preserve five complete paragraphs and supported language codes', () => {
  assert.equal(Object.keys(benThanhTranslations.translations).length, 7);
  assert.equal(Object.keys(palaceTranslations.translations).length, 13);
  for (const set of [benThanhTranslations, palaceTranslations]) {
    assert.match(set.sourceHash, /^[a-f0-9]{64}$/);
    for (const [language, text] of Object.entries(set.translations)) {
      assert.ok(supportsLanguage(language));
      assert.ok(text.name.trim().length > 0 && text.name.length <= 2000);
      assert.equal(text.description.split('\n\n').length, 5, `${set.slug}: ${language}`);
      assert.ok(text.description.length > 300 && text.description.length <= 20000);
      assert.ok(text.description.split('\n\n').every(paragraph => paragraph.trim().length > 40));
    }
  }
});
