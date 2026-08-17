import { createContext, useContext, useMemo } from 'react';
import { ru } from './ru';
import { kk } from './kk';
import { en } from './en';

export const DEFAULT_LOCALE = 'ru';
export const SUPPORTED_LOCALES = ['ru', 'kk', 'en'];
export const messages = { ru, kk, en };
export const I18nContext = createContext({ locale: DEFAULT_LOCALE });

export const normalizeLocale = (locale) => SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

const read = (source, key) => key.split('.').reduce((value, part) => value?.[part], source);

const interpolate = (message, values) => typeof message === 'string'
  ? message.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`)
  : message;

export const translate = (locale, key, values = {}) => {
  const normalized = normalizeLocale(locale);
  const message = read(messages[normalized], key) ?? read(messages[DEFAULT_LOCALE], key) ?? key;
  return interpolate(message, values);
};

export function useI18n() {
  const { locale } = useContext(I18nContext);
  return useMemo(() => ({
    locale: normalizeLocale(locale),
    t: (key, values) => translate(locale, key, values),
  }), [locale]);
}
