import { Globe2 } from 'lucide-react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { useI18n } from '../../shared/i18n/i18n';

export function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useAccessibilityStore();
  const { t } = useI18n();
  return (
    <label className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-stone-200 bg-paper px-3 text-sm font-bold">
      <Globe2 className="h-4 w-4 text-lavender-600" aria-hidden="true" />
      <span className={compact ? 'sr-only' : ''}>{t('language.label')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="min-w-0 max-w-24 cursor-pointer bg-transparent outline-none sm:max-w-none"
        aria-label={t('language.select')}
      >
        <option value="ru">RU</option>
        <option value="kk">ҚАЗ</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
