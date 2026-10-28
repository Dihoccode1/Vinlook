import { createHash } from 'node:crypto';
export const defaultNarrationLanguages = ['vi', 'en', 'zh-CN'] as const;
export function narrationKey(id: string, language: string, name: string, description: string, identity: string) {
  return createHash('sha256').update(JSON.stringify([id, language, `${name}. ${description}`, identity])).digest('hex');
}
