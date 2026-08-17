import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpenCheck, ChevronDown, LogOut, MessageCircleQuestion, Settings } from 'lucide-react';
import { SidebarNavigation } from '../navigation/SidebarNavigation';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { useAuthStore } from '../../features/auth/authStore';
import { notificationsApi } from '../../features/notifications/notificationsApi';

export function AppShell({ role = 'student' }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const defaultName = role === 'teacher' ? 'Учитель' : 'Ученик';
  const displayName = user?.name || defaultName;
  const immersiveAssistant = role === 'student' && pathname === '/student/assistant';

  const loadNotifications = async (isActive = () => true) => {
    try {
      const [list, count] = await Promise.all([notificationsApi.list(), notificationsApi.unreadCount()]);
      if (!isActive()) return;
      setNotifications(list.data.items || []);
      setUnreadCount(count.data.count || 0);
    } catch (_error) {
      if (isActive()) setNotifications([]);
    }
  };

  useEffect(() => {
    let active = true;
    loadNotifications(() => active);
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggleNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    setProfileOpen(false);
    if (nextOpen) loadNotifications();
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    await loadNotifications();
  };

  const leaveSession = async () => {
    try {
      await logout();
    } finally {
      setProfileOpen(false);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-canvas lg:pl-72">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">К содержимому</a>
      <SidebarNavigation role={role} />
      {!immersiveAssistant && (
        <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-xl">
          <div className="flex min-h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">{role === 'teacher' ? 'SANAQ for school' : 'Персональный маршрут'}</p>
              <p className="font-bold">{role === 'teacher' ? 'Кабинет учителя' : 'Мой учебный кабинет'}</p>
            </div>
            <div className="relative flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher compact />
              <button onClick={toggleNotifications} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-paper" aria-label="Уведомления" aria-expanded={notificationsOpen}>
                <Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />}
              </button>
              <button onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-2 sm:px-3" aria-label="Открыть меню профиля" aria-expanded={profileOpen}>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-lavender-200 text-sm font-extrabold text-lavender-700">{displayName[0]}</span>
                <span className="hidden text-sm font-bold sm:inline">{displayName}</span>
                <ChevronDown className="hidden h-4 w-4 sm:block" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-14 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-stone-200 bg-paper shadow-2xl" role="dialog" aria-label="Центр уведомлений">
                  <div className="flex items-center justify-between border-b border-stone-200 p-5"><div><p className="font-extrabold">Уведомления</p><p className="text-xs text-stone-500">{unreadCount} непрочитанных</p></div>{unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-bold text-lavender-700">Прочитать все</button>}</div>
                  <div className="p-2">
                    {notifications.map((item) => (
                      <button key={item.id} onClick={async () => { if (!item.read) await notificationsApi.markRead(item.id); setNotificationsOpen(false); if (item.link) navigate(item.link); }} className={`flex w-full gap-3 rounded-2xl p-4 text-left ${item.read ? 'opacity-60' : 'hover:bg-stone-100'}`}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lavender-100 text-lavender-700">{item.title.includes('комментар') ? <MessageCircleQuestion className="h-5 w-5" /> : <BookOpenCheck className="h-5 w-5" />}</span>
                        <span><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-stone-500">{item.body}</span></span>
                      </button>
                    ))}
                    {!notifications.length && <p className="p-5 text-center text-sm text-stone-500">Новых уведомлений нет</p>}
                  </div>
                </div>
              )}

              {profileOpen && (
                <div className="absolute right-0 top-14 z-50 w-64 rounded-3xl border border-stone-200 bg-paper p-2 shadow-2xl" role="menu">
                  <div className="border-b border-stone-200 p-3"><p className="font-bold">{displayName}</p><p className="text-xs text-stone-500">{user?.email || 'Email не загружен'}</p></div>
                  <button onClick={() => { navigate(role === 'student' ? '/student/settings' : '/teacher/dashboard'); setProfileOpen(false); }} className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-stone-100" role="menuitem"><Settings className="h-4 w-4" /> Настройки профиля</button>
                  <button onClick={leaveSession} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#A74735] hover:bg-[#FFE8E2]" role="menuitem"><LogOut className="h-4 w-4" /> Выйти</button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <main id="dashboard-content" tabIndex="-1" className={immersiveAssistant ? 'h-dvh overflow-hidden p-0' : 'px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10'}>
        <Outlet />
      </main>
      {!immersiveAssistant && <MobileNavigation role={role} />}
    </div>
  );
}
