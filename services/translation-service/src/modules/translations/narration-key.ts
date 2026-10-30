import { createHash } from 'node:crypto';
export const default_narration_languages = ['vi', 'en', 'zh-CN'] as const;
export function narration_key(id: string, language: string, name: string, description: string, identity: string) {
  return createHash('sha256').update(JSON.stringify([id, language, `${name}. ${description}`, identity])).digest('hex');
}
