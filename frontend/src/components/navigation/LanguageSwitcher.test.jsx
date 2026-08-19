import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../../app/providers/I18nProvider';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { useI18n } from '../../shared/i18n/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

function TranslationProbe() {
  const { t } = useI18n();
  return <p>{t('settings.title')}</p>;
}

beforeEach(() => {
  window.localStorage.clear();
  useAccessibilityStore.setState({ locale: 'ru' });
  document.documentElement.lang = 'ru';
});

test('changes rendered translations, document language and persisted locale', () => {
  render(<I18nProvider><LanguageSwitcher /><TranslationProbe /></I18nProvider>);
  const select = screen.getByRole('combobox', { name: 'Выбрать язык интерфейса' });

  expect(screen.getByText('Настройки')).toBeInTheDocument();
  fireEvent.change(select, { target: { value: 'kk' } });

  expect(screen.getByText('Баптаулар')).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Интерфейс тілін таңдау' })).toHaveValue('kk');
  expect(document.documentElement.lang).toBe('kk-KZ');
  expect(window.localStorage.getItem('sanaq.locale')).toBe('kk');
});

test('can switch from Kazakh to Russian without remounting', () => {
  useAccessibilityStore.setState({ locale: 'kk' });
  render(<I18nProvider><LanguageSwitcher /><TranslationProbe /></I18nProvider>);

  fireEvent.change(screen.getByRole('combobox', { name: 'Интерфейс тілін таңдау' }), { target: { value: 'ru' } });

  expect(screen.getByText('Настройки')).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('ru');
});
