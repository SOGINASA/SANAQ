import { Link } from 'react-router-dom';
import { Brand } from './Header';
import { useI18n } from '../../shared/i18n/i18n';

export function Footer() {
  const { t } = useI18n();
  return <footer className="border-t border-stone-200 bg-ink py-12 text-stone-300"><div className="page-container grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]"><div><Brand light /><p className="mt-4 max-w-md text-sm leading-7 text-stone-400">{t('footer.description')}</p></div><div><p className="font-bold text-white">{t('footer.platform')}</p><div className="mt-3 flex flex-col gap-2 text-sm"><Link to="/about" className="hover:text-white">{t('nav.how')}</Link><Link to="/accessibility" className="hover:text-white">{t('footer.accessibility')}</Link><Link to="/teacher/dashboard" className="hover:text-white">{t('nav.teachers')}</Link></div></div><div><p className="font-bold text-white">{t('footer.languages')}</p><p className="mt-3 text-sm text-stone-400">{t('language.kk')} · {t('language.ru')} · {t('language.en')}</p><p className="mt-5 text-xs text-stone-500">Future Minds Hackathon 2026</p></div></div></footer>;
}
