import { NavLink } from 'react-router-dom';
import { BookOpen, ChartNoAxesColumnIncreasing, ClipboardCheck, LayoutDashboard, Map, MessageCircleQuestion, Settings, LibraryBig, ListChecks } from 'lucide-react';
import { Brand } from '../layout/Header';
import { cn } from '../../shared/lib/cn';

const studentItems = [
  { label: 'Обзор', to: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Мой маршрут', to: '/student/path', icon: BookOpen },
  { label: 'Карта знаний', to: '/student/knowledge-map', icon: Map },
  { label: 'Ассистент SANA', to: '/student/assistant', icon: MessageCircleQuestion },
  { label: 'Прогресс', to: '/student/progress', icon: ChartNoAxesColumnIncreasing },
  { label: 'Достижения', to: '/student/achievements', icon: ClipboardCheck },
  { label: 'Настройки', to: '/student/settings', icon: Settings },
];

const teacherItems = [
  { label: 'Обзор класса', to: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Материалы', to: '/teacher/content', icon: LibraryBig },
  { label: 'Назначения', to: '/teacher/assignments', icon: ListChecks },
];

export function SidebarNavigation({ role = 'student' }) {
  const items = role === 'teacher' ? teacherItems : studentItems;
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-stone-200 bg-paper p-5 lg:flex lg:flex-col">
      <Brand />
      <p className="mb-3 mt-10 px-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-400">{role === 'teacher' ? 'Кабинет учителя' : 'Моё обучение'}</p>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Навигация кабинета">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn('flex min-h-12 items-center gap-3 rounded-2xl px-4 font-semibold text-stone-600 transition hover:bg-lavender-50 hover:text-lavender-700', isActive && 'bg-lavender-100 text-lavender-700')}
          >
            <Icon className="h-5 w-5" aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
      {role === 'student' && <NavLink to="/student/assistant" className="rounded-3xl bg-ink p-5 text-white transition hover:-translate-y-0.5 hover:bg-stone-800">
        <p className="text-xs font-bold uppercase tracking-widest text-lime">SANA рядом</p>
        <p className="mt-2 text-sm text-stone-300">Задай вопрос по текущей теме — без готового ответа.</p>
      </NavLink>}
    </aside>
  );
}
