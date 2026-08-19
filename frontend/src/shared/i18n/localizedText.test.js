import { localizedText } from './localizedText';

test('selects a localized value and falls back safely', () => {
  const value = { ru: 'Экзамен', kk: 'Емтихан', en: 'Exam' };
  expect(localizedText(value, 'kk')).toBe('Емтихан');
  expect(localizedText(value, 'en')).toBe('Exam');
  expect(localizedText({ ru: 'Только русский' }, 'kk')).toBe('Только русский');
  expect(localizedText(null, 'ru', '—')).toBe('—');
});

test('never returns a localization object to React', () => {
  expect(typeof localizedText({ kk: 'Мақсат', ru: 'Цель' }, 'kk')).toBe('string');
  expect(localizedText([{ ru: 'invalid' }], 'ru')).toBe('');
});
