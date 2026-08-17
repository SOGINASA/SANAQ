import { useEffect } from 'react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { I18nContext, normalizeLocale } from '../../shared/i18n/i18n';

export function I18nProvider({ children }) {
  const locale = useAccessibilityStore((state) => state.locale);

  useEffect(() => {
    const normalized = normalizeLocale(locale);
    document.documentElement.lang = normalized === 'kk' ? 'kk-KZ' : normalized === 'en' ? 'en' : 'ru';
    window.localStorage.setItem('sanaq.locale', normalized);
  }, [locale]);

  return <I18nContext.Provider value={{ locale: normalizeLocale(locale) }}>{children}</I18nContext.Provider>;
}
