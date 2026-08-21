import { useState } from 'react';
import { Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../shared/lib/cn';
import { useI18n } from '../../shared/i18n/i18n';
import { Dialog } from '../../shared/ui';
import { getNavigationItems } from './navigationItems';

const itemClass = (active) => cn('flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center text-[10px] font-bold leading-tight text-stone-500 sm:text-[11px]', active && 'bg-lavender-100 text-lavender-700');

export function MobileNavigation({ role = 'student' }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = getNavigationItems(role);
  const mobileItems = role === 'student'
    ? [items[0], items[1], items[4], items[3], items[2], ...items.slice(5)]
    : items;
  const primaryItems = mobileItems.slice(0, 3);
  const moreItems = mobileItems.slice(3);
  const moreActive = moreItems.some(([, to]) => pathname === to || pathname.startsWith(`${to}/`));

  return <>
    <nav className="fixed inset-x-1.5 bottom-[max(0.375rem,env(safe-area-inset-bottom))] z-40 grid min-h-16 grid-flow-col auto-cols-fr items-center rounded-3xl border border-stone-200 bg-paper/95 p-1 shadow-soft backdrop-blur-xl min-[360px]:inset-x-2 min-[360px]:bottom-[max(0.5rem,env(safe-area-inset-bottom))] min-[360px]:p-1.5 sm:inset-x-3 sm:p-2 lg:hidden" aria-label={t('nav.mobile')}>
      {primaryItems.map(([key, to, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => itemClass(isActive)}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="w-full truncate">{t(key)}</span></NavLink>)}
      {moreItems.length > 0 && <button type="button" onClick={() => setMoreOpen(true)} className={itemClass(moreActive)} aria-haspopup="dialog" aria-expanded={moreOpen}><Menu className="h-5 w-5" /><span className="w-full truncate">{t('mobileMenu.more')}</span></button>}
    </nav>
    <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t('mobileMenu.title')} description={t('mobileMenu.description')} size="sm">
      <nav className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2" aria-label={t('mobileMenu.title')}>
        {moreItems.map(([key, to, Icon]) => <NavLink key={to} to={to} onClick={() => setMoreOpen(false)} className={({ isActive }) => cn('flex min-h-24 flex-col items-start justify-between rounded-2xl border border-stone-200 p-4 font-bold text-stone-600 transition hover:border-lavender-300 hover:bg-lavender-50', isActive && 'border-lavender-300 bg-lavender-100 text-lavender-700')}><Icon className="h-5 w-5" aria-hidden="true" /><span className="break-words text-left text-sm">{t(key)}</span></NavLink>)}
      </nav>
    </Dialog>
  </>;
}
