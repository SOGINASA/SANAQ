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
