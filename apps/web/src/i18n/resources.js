import r0 from './resources/en.json' with { type: 'json' };
import r1 from './resources/zh-Hant.json' with { type: 'json' };
import r2 from './resources/hi.json' with { type: 'json' };
import r3 from './resources/es.json' with { type: 'json' };
import r4 from './resources/ar.json' with { type: 'json' };
import r5 from './resources/fr.json' with { type: 'json' };
import r6 from './resources/bn.json' with { type: 'json' };
import r7 from './resources/pt-PT.json' with { type: 'json' };
import r8 from './resources/id.json' with { type: 'json' };
import r9 from './resources/ur.json' with { type: 'json' };
import r10 from './resources/ru.json' with { type: 'json' };
import r11 from './resources/de.json' with { type: 'json' };
import r12 from './resources/ja.json' with { type: 'json' };
import r13 from './resources/pcm.json' with { type: 'json' };
import r14 from './resources/ar-EG.json' with { type: 'json' };
import r15 from './resources/vi.json' with { type: 'json' };
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
export const resources = freeze({
  en: { translation: r0 },
  'zh-Hant': { translation: r1 },
  hi: { translation: r2 },
  es: { translation: r3 },
  ar: { translation: r4 },
  fr: { translation: r5 },
  bn: { translation: r6 },
  'pt-PT': { translation: r7 },
  id: { translation: r8 },
  ur: { translation: r9 },
  ru: { translation: r10 },
  de: { translation: r11 },
  ja: { translation: r12 },
  pcm: { translation: r13 },
  'ar-EG': { translation: r14 },
  vi: { translation: r15 },
});
