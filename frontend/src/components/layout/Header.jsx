import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../shared/ui';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';

export function Brand({ light = false }) {
  const { t } = useI18n();
  return <Link to="/" className="inline-flex min-h-11 items-center gap-3 rounded-xl" aria-label={t('brand.home')}><span className="grid h-10 w-10 place-items-center rounded-2xl bg-lavender-600 text-white shadow-lg shadow-lavender-200"><Sparkles className="h-5 w-5" aria-hidden="true" /></span><span className={`font-display text-lg font-semibold tracking-[-0.04em] ${light ? 'text-white' : 'text-ink'}`}>SANAQ</span></Link>;
}

const links = [['nav.how', '/#product'], ['nav.features', '/#features'], ['nav.ai', '/#ai'], ['nav.teachers', '/teacher/dashboard']];

export function Header() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { t } = useI18n();
  return <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-xl">
    <div className="page-container flex min-h-[76px] items-center justify-between gap-4"><Brand /><nav className="hidden items-center gap-7 lg:flex" aria-label={t('nav.main')}>{links.map(([key, href]) => <NavLink key={key} to={href} className="rounded-lg text-sm font-semibold text-stone-600 transition hover:text-ink">{t(key)}</NavLink>)}</nav>
      <div className="hidden items-center gap-3 sm:flex"><LanguageSwitcher compact />{user ? <Button onClick={() => navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')}>{t('common.dashboard')} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button> : <><Button variant="ghost" onClick={() => navigate('/login')}>{t('common.login')}</Button><Button onClick={() => navigate('/register')}>{t('common.startFree')}</Button></>}</div>
      <button className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-paper sm:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? t('common.closeMenu') : t('common.openMenu')}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <div className="border-t border-stone-200 bg-paper px-4 pb-5 pt-3 sm:hidden"><nav className="flex flex-col gap-1" aria-label={t('nav.mobile')}><div className="mb-2"><LanguageSwitcher /></div>{links.map(([key, href]) => <NavLink key={key} to={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-semibold hover:bg-lavender-50">{t(key)}</NavLink>)}<NavLink to="/login" onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-semibold hover:bg-lavender-50">{t('common.login')}</NavLink><Button className="mt-2 w-full" onClick={() => { setOpen(false); navigate('/register'); }}>{t('common.startFree')}</Button></nav></div>}
  </header>;
}
