export const languages = [
  { code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' }, { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' }, { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '简体中文' }, { code: 'th', name: 'ไทย' },
  { code: 'id', name: 'Bahasa Indonesia' }, { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'ar', name: 'العربية' }, { code: 'hi', name: 'हिन्दी' },
] as const;
export type LanguageCode = typeof languages[number]['code'];
export function supportsLanguage(value: string): value is LanguageCode { return languages.some(language => language.code === value); }
