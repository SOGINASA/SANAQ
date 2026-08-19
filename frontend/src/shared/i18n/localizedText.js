import { normalizeLocale } from './i18n';

export function localizedText(value, locale, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object' || Array.isArray(value)) return fallback;
  const normalized = normalizeLocale(locale);
  return value[normalized] || value.ru || value.kk || value.en || Object.values(value).find((item) => typeof item === 'string') || fallback;
}
