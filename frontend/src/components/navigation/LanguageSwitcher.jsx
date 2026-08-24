import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { useI18n } from '../../shared/i18n/i18n';

const languages = [
  { value: 'ru', shortLabel: 'RU' },
  { value: 'kk', shortLabel: 'KZ' },
  { value: 'en', shortLabel: 'EN' },
];

export function LanguageSwitcher({ compact = false, navbar = false }) {
  const { locale, setLocale } = useAccessibilityStore();
  const { t } = useI18n();

  if (navbar) {
    return <NavbarLanguageSwitcher locale={locale} setLocale={setLocale} t={t} />;
  }

  return (
    <label className={`inline-flex min-h-11 max-w-full items-center rounded-xl border border-stone-200 bg-paper text-sm font-bold ${compact ? 'gap-1 px-2' : 'gap-2 px-3'}`}>
      <Globe2 className="h-4 w-4 text-lavender-600" aria-hidden="true" />
      <span className={compact ? 'sr-only' : ''}>{t('language.label')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="min-w-0 max-w-24 cursor-pointer bg-transparent outline-none sm:max-w-none"
        aria-label={t('language.select')}
      >
        <option value="ru">RU</option>
        <option value="kk">KZ</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

function NavbarLanguageSwitcher({ locale, setLocale, t }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const activeLanguage = languages.find((language) => language.value === locale) ?? languages[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectLanguage = (value) => {
    setLocale(value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`group inline-flex min-h-11 items-center gap-1.5 rounded-2xl border px-2.5 text-sm font-extrabold transition sm:gap-2 sm:px-3 ${open ? 'border-lavender-300 bg-lavender-50 text-lavender-800 shadow-soft' : 'border-stone-200 bg-paper text-ink hover:border-lavender-200 hover:bg-lavender-50/70'}`}
        aria-label={t('language.select')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-lavender-100 text-lavender-700 transition group-hover:bg-lavender-200" aria-hidden="true">
          <Globe2 className="h-4 w-4" />
        </span>
        <span>{activeLanguage.shortLabel}</span>
        <ChevronDown className={`h-4 w-4 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.625rem)] z-50 w-52 overflow-hidden rounded-2xl border border-stone-200 bg-paper p-1.5 shadow-overlay" role="listbox" aria-label={t('language.select')}>
          <div className="px-3 pb-1.5 pt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-stone-400">{t('language.label')}</div>
          {languages.map((language) => {
            const selected = language.value === locale;
            return (
              <button
                key={language.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => selectLanguage(language.value)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${selected ? 'bg-lavender-100 text-lavender-800' : 'text-stone-700 hover:bg-stone-100 hover:text-ink'}`}
              >
                <span className={`grid h-7 w-9 place-items-center rounded-lg text-xs font-extrabold ${selected ? 'bg-paper text-lavender-700' : 'bg-stone-100 text-stone-500'}`}>{language.shortLabel}</span>
                <span className="flex-1">{t(`language.${language.value}`)}</span>
                {selected && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
