/**
 * @file useVisitorStore.ts
 * @description Quản lý tùy chọn và trạng thái cục bộ của du khách (ngôn ngữ ưa thích, lịch sử)
 */

const STORAGE_KEY_LANG = 'vinlook_visitor_language';

export function getStoredLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_LANG) || 'vi';
  } catch {
    return 'vi';
  }
}

export function setStoredLanguage(lang: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  } catch {
    // Không chặn ứng dụng nếu localStorage bị khóa
  }
}
