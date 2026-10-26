import { localeCodes } from './locales.js';
const unsafe = /[<>\x00-\x1f\x7f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const placeholders = (value) =>
  [...value.matchAll(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g)].map((m) => m[1]).sort();
export function flatten(value, prefix = '') {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('INVALID_RESOURCE');
  const entries = {};
  for (const [key, part] of Object.entries(value)) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) ||
      ['constructor', 'prototype', '__proto__'].includes(key)
    )
      throw new Error('INVALID_RESOURCE_KEY');
    const path = prefix ? prefix + '.' + key : key;
    if (typeof part === 'string') {
      if (
        !part.trim() ||
        unsafe.test(part) ||
        part.replace(/{{[a-zA-Z][a-zA-Z0-9]*}}/g, '').match(/[{}]/)
      )
        throw new Error('INVALID_RESOURCE_TEXT');
      entries[path] = part;
    } else Object.assign(entries, flatten(part, path));
  }
  return entries;
}
export function validateResources(resources) {
  if (Object.keys(resources).sort().join(',') !== [...localeCodes].sort().join(','))
    throw new Error('INVALID_LOCALE_SET');
  const english = flatten(resources.en.translation),
    keys = Object.keys(english).sort().join(',');
  const parameters = {
    'map.foundCount': ['count'],
    'navigation.walkTo': ['name'],
    'navigation.distance': ['distance'],
  };
  for (const [key, value] of Object.entries(english))
    if (JSON.stringify(placeholders(value)) !== JSON.stringify(parameters[key] ?? []))
      throw new Error('INVALID_SOURCE_PARAMETERS');
  for (const [locale, resource] of Object.entries(resources)) {
    if (Object.keys(resource).join(',') !== 'translation') throw new Error('INVALID_RESOURCE');
    const flat = flatten(resource.translation);
    if (Object.keys(flat).sort().join(',') !== keys) throw new Error('INCOMPLETE_RESOURCE');
    for (const key of Object.keys(english))
      if (JSON.stringify(placeholders(flat[key])) !== JSON.stringify(placeholders(english[key])))
        throw new Error('PLACEHOLDER_MISMATCH');
    if (locale !== 'en' && flat['preview.title'] === english['preview.title'])
      throw new Error('UNTRANSLATED_PREVIEW');
  }
  return { locales: localeCodes.length, keys: Object.keys(english).length };
}
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return (
    '{' +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonical(value[key]))
      .join(',') +
    '}'
  );
}
