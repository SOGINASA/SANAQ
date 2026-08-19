import { messages, normalizeLocale, SUPPORTED_LOCALES, translate } from './i18n';

const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return child && typeof child === 'object' && !Array.isArray(child) ? keys(child, path) : [path];
});

test('translates navigation in all supported languages', () => {
  expect(translate('ru', 'nav.settings')).toBe('Настройки');
  expect(translate('kk', 'nav.settings')).toBe('Баптаулар');
  expect(translate('en', 'nav.settings')).toBe('Settings');
});

test('falls back to Russian for an unsupported locale', () => {
  expect(normalizeLocale('de')).toBe('ru');
  expect(translate('de', 'common.login')).toBe('Войти');
});

test('falls back to the key when a message is missing', () => {
  expect(translate('en', 'missing.message')).toBe('missing.message');
});

test('all locales expose the same translation keys', () => {
  const reference = keys(messages.ru).sort();
  SUPPORTED_LOCALES.forEach((locale) => expect(keys(messages[locale]).sort()).toEqual(reference));
});

test('structured translation values remain structured', () => {
  expect(translate('en', 'auth.benefits')).toHaveLength(3);
});

test('interpolates values in every supported locale', () => {
  expect(translate('ru', 'shell.unread', { count: 3 })).toBe('3 непрочитанных');
  expect(translate('kk', 'shell.unread', { count: 3 })).toBe('3 оқылмаған');
  expect(translate('en', 'shell.unread', { count: 3 })).toBe('3 unread');
});

test('translation catalogs do not contain broken UTF-8 text', () => {
  const suspicious = /(?:Р[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ]|С[ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ]|вЂ|Тљ)/;
  const values = (value) => Object.values(value).flatMap((child) => child && typeof child === 'object' ? values(child) : [child]);
  SUPPORTED_LOCALES.forEach((locale) => values(messages[locale]).filter((value) => typeof value === 'string').forEach((value) => expect(value).not.toMatch(suspicious)));
});
