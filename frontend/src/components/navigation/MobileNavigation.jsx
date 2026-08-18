import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, MessageCircleQuestion, LibraryBig, School } from 'lucide-react';
import { cn } from '../../shared/lib/cn';
import { useI18n } from '../../shared/i18n/i18n';

export function MobileNavigation({ role = 'student' }) {
  const { t } = useI18n();
  const items = role === 'teacher' ? [['nav.overview', '/teacher/dashboard', LayoutDashboard], ['nav.content', '/teacher/content', LibraryBig]] : [['nav.overview', '/student/dashboard', LayoutDashboard], ['nav.classroom', '/student/class', School], ['nav.path', '/student/path', BookOpen], ['nav.assistant', '/student/assistant', MessageCircleQuestion]];
  return <nav className="fixed inset-x-3 bottom-3 z-40 flex min-h-16 items-center justify-around rounded-3xl border border-stone-200 bg-paper/95 px-2 shadow-soft backdrop-blur-xl lg:hidden" aria-label={t('nav.mobile')}>{items.map(([key, to, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => cn('flex min-h-12 min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold text-stone-500', isActive && 'bg-lavender-100 text-lavender-700')}><Icon className="h-5 w-5" aria-hidden="true" /> {t(key)}</NavLink>)}</nav>;
}
