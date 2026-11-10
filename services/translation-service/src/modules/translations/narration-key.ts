/**
 * @file narration-key.ts
 * @description Hàm băm SHA-256 tạo khóa định danh duy nhất cho nội dung văn bản cần tổng hợp giọng đọc.
 */

import { createHash } from 'node:crypto';
export const default_narration_languages = ['vi', 'en', 'zh-CN'] as const;
export function narration_key(id: string, language: string, name: string, description: string, identity: string) {
  return createHash('sha256').update(JSON.stringify([id, language, `${name}. ${description}`, identity])).digest('hex');
}
