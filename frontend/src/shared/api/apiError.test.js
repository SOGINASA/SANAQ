import { localizedApiErrorMessage, toApiError } from './apiError';

const setLocale = (locale) => window.localStorage.setItem(
  'sanaq-accessibility',
  JSON.stringify({ state: { locale }, version: 0 }),
);

afterEach(() => window.localStorage.clear());

test.each([
  ['ru', 'Неверный email или пароль.'],
  ['kk', 'Email немесе құпиясөз қате.'],
  ['en', 'Incorrect email or password.'],
])('localizes API error codes for %s', (locale, expected) => {
  setLocale(locale);
  expect(localizedApiErrorMessage('INVALID_CREDENTIALS', 401)).toBe(expected);
});

test('never exposes a structured backend message as a React-facing Error.message', () => {
  setLocale('en');
  const error = toApiError({
    response: {
      status: 422,
      data: { error: { code: 'VALIDATION_ERROR', message: { ru: 'Ошибка', kk: 'Қате' } } },
    },
  });
  expect(error.message).toBe('Check the completed fields.');
  expect(typeof error.message).toBe('string');
});

test('uses a localized safe fallback for unknown codes', () => {
  setLocale('kk');
  expect(localizedApiErrorMessage('NEW_SERVER_CODE', 500)).toBe('Сұрауды орындау мүмкін болмады. Қайталап көріңіз.');
});
