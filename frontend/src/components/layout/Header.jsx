import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../shared/ui';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';

export function Brand({ light = false, compactOnMobile = false }) {
  const { t } = useI18n();
  return <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl sm:gap-3" aria-label={t('brand.home')}><img src="/sanaq-logo.svg" alt="" className="h-10 w-10 shrink-0" width="40" height="40" /><span className={`${compactOnMobile ? 'hidden min-[390px]:inline' : ''} font-display text-lg font-semibold tracking-[-0.04em] ${light ? 'text-white' : 'text-ink'}`}>SANAQ</span></Link>;
}

const links = [['nav.how', '/#product'], ['nav.features', '/#features'], ['nav.ai', '/#ai'], ['nav.teachers', '/teacher/dashboard']];

export function Header() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { t } = useI18n();
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
  return <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-xl">
    <div className="page-container flex min-h-[68px] min-w-0 items-center justify-between gap-1.5 max-[359px]:px-2 sm:min-h-[76px] sm:gap-4"><Brand compactOnMobile /><nav className="hidden items-center gap-7 lg:flex" aria-label={t('nav.main')}>{links.map(([key, href]) => <NavLink key={key} to={href} className="rounded-lg text-sm font-semibold text-stone-600 transition hover:text-ink">{t(key)}</NavLink>)}</nav>
      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3"><LanguageSwitcher navbar />{user ? <Button size="sm" onClick={() => navigate(dashboardPath)}><span className="hidden sm:inline">{t('common.dashboard')}</span><ArrowRight className="h-4 w-4" aria-hidden="true" /></Button> : <><Button size="sm" variant="ghost" onClick={() => navigate('/login')}>{t('common.login')}</Button><Button className="hidden sm:inline-flex" onClick={() => navigate('/register')}>{t('common.startFree')}</Button></>}
      <button className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-2xl border border-stone-200 bg-paper lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? t('common.closeMenu') : t('common.openMenu')}>{open ? <X /> : <Menu />}</button></div>
    </div>
    {open && <div className="border-t border-stone-200 bg-paper px-4 pb-5 pt-3 lg:hidden"><nav className="flex flex-col gap-1" aria-label={t('nav.mobile')}>{links.map(([key, href]) => <NavLink key={key} to={href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-semibold hover:bg-lavender-50">{t(key)}</NavLink>)}{!user && <Button className="mt-2 w-full" onClick={() => { setOpen(false); navigate('/register'); }}>{t('common.startFree')}</Button>}</nav></div>}
  </header>;
}
