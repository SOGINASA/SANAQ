import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, MessageCircleQuestion, LibraryBig, School } from 'lucide-react';
import { cn } from '../../shared/lib/cn';
import { useI18n } from '../../shared/i18n/i18n';

export function MobileNavigation({ role = 'student' }) {
  const { t } = useI18n();
  const items = role === 'teacher' ? [['nav.overview', '/teacher/dashboard', LayoutDashboard], ['nav.content', '/teacher/content', LibraryBig]] : [['nav.overview', '/student/dashboard', LayoutDashboard], ['nav.classroom', '/student/class', School], ['nav.path', '/student/path', BookOpen], ['nav.assistant', '/student/assistant', MessageCircleQuestion]];
  return <nav className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 grid min-h-16 grid-flow-col auto-cols-fr items-center rounded-3xl border border-stone-200 bg-paper/95 p-1.5 shadow-soft backdrop-blur-xl sm:inset-x-3 sm:p-2 lg:hidden" aria-label={t('nav.mobile')}>{items.map(([key, to, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => cn('flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center text-[10px] font-bold leading-tight text-stone-500 sm:text-[11px]', isActive && 'bg-lavender-100 text-lavender-700')}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> <span className="w-full truncate">{t(key)}</span></NavLink>)}</nav>;
}
