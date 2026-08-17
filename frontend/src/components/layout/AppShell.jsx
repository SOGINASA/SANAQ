import { Outlet, useLocation } from 'react-router-dom';
import { Bell, ChevronDown } from 'lucide-react';
import { SidebarNavigation } from '../navigation/SidebarNavigation';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { useAuthStore } from '../../features/auth/authStore';

export function AppShell({ role = 'student' }) {
  const user = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const fallbackName = role === 'teacher' ? 'Учитель' : 'Ученик';
  const prototypeDataRoutes = role === 'teacher' || [
    '/student/onboarding',
    '/student/diagnostic',
    '/student/path',
    '/student/knowledge-map',
    '/student/learn/',
    '/student/task/',
    '/student/progress',
    '/student/achievements',
    '/student/assistant',
  ].some((route) => pathname.startsWith(route));
  return (
    <div className="min-h-screen bg-canvas lg:pl-72">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">К содержимому</a>
      <SidebarNavigation role={role} />
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-xl">
        <div className="flex min-h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">{role === 'teacher' ? 'SANAQ for school' : 'Персональный маршрут'}</p>
            <p className="font-bold">{role === 'teacher' ? '9A · Математика' : '9 класс · Математика'}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher compact />
            <button className="relative grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-paper" aria-label="Уведомления">
              <Bell className="h-5 w-5" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />
            </button>
            <button className="flex min-h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-2 sm:px-3" aria-label="Открыть меню профиля">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-lavender-200 text-sm font-extrabold text-lavender-700">{fallbackName[0]}</span>
              <span className="hidden text-sm font-bold sm:inline">{user?.name || fallbackName}</span>
              <ChevronDown className="hidden h-4 w-4 sm:block" />
            </button>
          </div>
        </div>
      </header>
      <main id="dashboard-content" tabIndex="-1" className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        {prototypeDataRoutes && (
          <div className="mx-auto mb-5 max-w-7xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
            <strong>Визуальный прототип:</strong> на этой странице показаны локальные mock-данные; Backend API ещё не подключён.
          </div>
        )}
        <Outlet />
      </main>
      <MobileNavigation role={role} />
    </div>
  );
}
