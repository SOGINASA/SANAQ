import { Globe2 } from 'lucide-react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';

export function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useAccessibilityStore();
  return (
    <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-paper px-3 text-sm font-bold">
      <Globe2 className="h-4 w-4 text-lavender-600" aria-hidden="true" />
      <span className={compact ? 'sr-only' : ''}>Язык</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="cursor-pointer bg-transparent outline-none"
        aria-label="Выбрать язык интерфейса"
      >
        <option value="ru">RU</option>
        <option value="kk">ҚАЗ</option>
      </select>
    </label>
  );
}
