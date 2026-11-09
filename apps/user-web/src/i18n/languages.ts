/**
 * @file languages.ts
 * @description Danh mục ngôn ngữ thuyết minh và dịch thuật phục vụ khách du lịch
 */

export interface TouristLanguage {
  code: string;
  name: string;
  native: string;
}

export const TOURIST_LANGUAGES: TouristLanguage[] = [
  { code: 'vi', name: 'Tiếng Việt', native: 'Tiếng Việt' },
  { code: 'en', name: 'Tiếng Anh', native: 'English' },
  { code: 'fr', name: 'Tiếng Pháp', native: 'Français' },
  { code: 'de', name: 'Tiếng Đức', native: 'Deutsch' },
  { code: 'es', name: 'Tiếng Tây Ban Nha', native: 'Español' },
  { code: 'it', name: 'Tiếng Ý', native: 'Italiano' },
  { code: 'pt', name: 'Tiếng Bồ Đào Nha', native: 'Português' },
  { code: 'ru', name: 'Tiếng Nga', native: 'Русский' },
  { code: 'ja', name: 'Tiếng Nhật', native: '日本語' },
  { code: 'ko', name: 'Tiếng Hàn', native: '한국어' },
  { code: 'zh-CN', name: 'Tiếng Trung (Giản thể)', native: '简体中文' },
  { code: 'th', name: 'Tiếng Thái', native: 'ไทย' },
  { code: 'id', name: 'Tiếng Indonesia', native: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Tiếng Mã Lai', native: 'Bahasa Melayu' },
  { code: 'ar', name: 'Tiếng Ả Rập', native: 'العربية' },
  { code: 'hi', name: 'Tiếng Hindi', native: 'हिन्दी' }
];
