import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, MessageCircleQuestion, Users, LibraryBig } from 'lucide-react';
import { cn } from '../../shared/lib/cn';

export function MobileNavigation({ role = 'student' }) {
  const items = role === 'teacher'
    ? [
        { label: 'Обзор', to: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'Классы', to: '/teacher/classes/9a', icon: Users },
        { label: 'Контент', to: '/teacher/content', icon: LibraryBig },
      ]
    : [
        { label: 'Обзор', to: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Маршрут', to: '/student/path', icon: BookOpen },
        { label: 'SANA', to: '/student/assistant', icon: MessageCircleQuestion },
      ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex min-h-16 items-center justify-around rounded-3xl border border-stone-200 bg-paper/95 px-2 shadow-soft backdrop-blur-xl lg:hidden" aria-label="Мобильная навигация кабинета">
      {items.map(({ label, to, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => cn('flex min-h-12 min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold text-stone-500', isActive && 'bg-lavender-100 text-lavender-700')}>
          <Icon className="h-5 w-5" aria-hidden="true" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
