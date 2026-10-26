import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources.js';
import { localeCodes, isLocale } from './locales.js';
export function createUiI18n(locale = 'en') {
  if (!isLocale(locale)) throw new Error('INVALID_LOCALE');
  const instance = createInstance();
  instance.use(initReactI18next).init({
    resources: structuredClone(resources),
    lng: locale,
    supportedLngs: localeCodes,
    load: 'currentOnly',
    fallbackLng: 'en',
    nonExplicitSupportedLngs: false,
    initAsync: false,
    debug: false,
    saveMissing: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false, transSupportBasicHtmlNodes: false },
  });
  return instance;
}
