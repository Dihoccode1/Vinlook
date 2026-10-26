export const locales = Object.freeze(
  [
    { code: 'en', name: 'English', direction: 'ltr' },
    { code: 'zh-Hant', name: '繁體中文', direction: 'ltr' },
    { code: 'hi', name: 'हिन्दी', direction: 'ltr' },
    { code: 'es', name: 'Español', direction: 'ltr' },
    { code: 'ar', name: 'العربية الفصحى', direction: 'rtl' },
    { code: 'fr', name: 'Français', direction: 'ltr' },
    { code: 'bn', name: 'বাংলা', direction: 'ltr' },
    { code: 'pt-PT', name: 'Português (Portugal)', direction: 'ltr' },
    { code: 'id', name: 'Bahasa Indonesia', direction: 'ltr' },
    { code: 'ur', name: 'اردو', direction: 'rtl' },
    { code: 'ru', name: 'Русский', direction: 'ltr' },
    { code: 'de', name: 'Deutsch', direction: 'ltr' },
    { code: 'ja', name: '日本語', direction: 'ltr' },
    { code: 'pcm', name: 'Nigerian Pidgin', direction: 'ltr' },
    { code: 'ar-EG', name: 'العربية المصرية', direction: 'rtl' },
    { code: 'vi', name: 'Tiếng Việt', direction: 'ltr' },
  ].map(Object.freeze),
);
export const localeCodes = Object.freeze(locales.map((l) => l.code));
export const isLocale = (code) => typeof code === 'string' && localeCodes.includes(code);
export const direction = (code) => locales.find((l) => l.code === code)?.direction ?? 'ltr';
