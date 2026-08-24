import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AccessibilityMenu } from '../../features/accessibility';
import { Bell, BookOpenCheck, ChevronDown, LogOut, MessageCircleQuestion, Settings } from 'lucide-react';
import { SidebarNavigation } from '../navigation/SidebarNavigation';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import { useAuthStore } from '../../features/auth/authStore';
import { notificationsApi } from '../../features/notifications/notificationsApi';
import { useI18n } from '../../shared/i18n/i18n';
import { getNavigationItems } from '../navigation/navigationItems';

export function AppShell({ role = 'student' }) {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const defaultName = role === 'admin' ? t('roles.admin') : role === 'teacher' ? t('shell.teacher') : t('shell.student');
  const displayName = user?.name || defaultName;
  const immersiveAssistant = role === 'student' && pathname === '/student/assistant';
  const currentPageKey = (() => {
    if (role === 'student' && /^\/student\/(onboarding|diagnostic|generating-plan)/.test(pathname)) return 'nav.overview';
    if (role === 'student' && /^\/student\/(learn|task)/.test(pathname)) return 'nav.path';
    if (role === 'teacher' && /^\/teacher\/(classes|students)/.test(pathname)) return 'nav.classOverview';
    const match = [...getNavigationItems(role)].sort((left, right) => right[1].length - left[1].length).find(([, to]) => pathname === to || pathname.startsWith(`${to}/`));
    return match?.[0] || (role === 'admin' ? 'nav.adminOverview' : role === 'teacher' ? 'nav.classOverview' : 'nav.overview');
  })();

  const loadNotifications = async (isActive = () => true) => {
    try {
      // The list request materializes due reminders before the unread count is calculated.
      const list = await notificationsApi.list();
      const count = await notificationsApi.unreadCount();
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
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">{t('shell.skip')}</a>
      <SidebarNavigation role={role} />
      {!immersiveAssistant && (
        <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-canvas/90 backdrop-blur-xl">
          <div className="flex min-h-[68px] min-w-0 items-center justify-between gap-1.5 px-2.5 min-[360px]:gap-2 min-[360px]:px-3 sm:min-h-[76px] sm:gap-4 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold sm:hidden">{t(currentPageKey)}</p>
              <p className="hidden text-xs font-bold uppercase tracking-[0.16em] text-stone-400 sm:block">{role === 'admin' ? 'SANAQ Control Center' : role === 'teacher' ? 'SANAQ for school' : t('shell.personalPath')}</p>
              <p className="hidden truncate font-bold sm:block">{role === 'admin' ? t('nav.adminArea') : role === 'teacher' ? t('teacher.dashboard') : t('shell.studentCabinet')}</p>
            </div>
            <div className="relative flex min-w-0 shrink-0 items-center gap-1 min-[360px]:gap-1.5 sm:gap-3">
              <LanguageSwitcher navbar />
              <button onClick={toggleNotifications} className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-2xl border border-stone-200 bg-paper" aria-label={t('shell.notifications')} aria-expanded={notificationsOpen}>
                <Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral" />}
              </button>
              <button onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-stone-200 bg-paper px-2 sm:px-3" aria-label={t('shell.profileMenu')} aria-expanded={profileOpen}>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-lavender-200 text-sm font-extrabold text-lavender-700">{displayName[0]}</span>
                <span className="hidden text-sm font-bold sm:inline">{displayName}</span>
                <ChevronDown className="hidden h-4 w-4 sm:block" />
              </button>

              {notificationsOpen && (
                <div className="fixed inset-x-2 top-[72px] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-3xl border border-stone-200 bg-paper shadow-2xl min-[400px]:absolute min-[400px]:inset-x-auto min-[400px]:right-0 min-[400px]:top-14 min-[400px]:w-[min(360px,calc(100vw-2rem))]" role="dialog" aria-label={t('shell.notificationCenter')}>
                  <div className="flex items-center justify-between border-b border-stone-200 p-5"><div><p className="font-extrabold">{t('shell.notifications')}</p><p className="text-xs text-stone-500">{t('shell.unread', { count: unreadCount })}</p></div>{unreadCount > 0 && <button onClick={markAllRead} className="cursor-pointer text-xs font-bold text-lavender-700">{t('shell.readAll')}</button>}</div>
                  <div className="max-h-[min(65dvh,32rem)] overflow-y-auto p-2">
                    {notifications.map((item) => (
                      <button key={item.id} onClick={async () => { if (!item.read) await notificationsApi.markRead(item.id); setNotificationsOpen(false); if (item.link) navigate(item.link); }} className={`flex w-full gap-3 rounded-2xl p-4 text-left ${item.read ? 'opacity-60' : 'hover:bg-stone-100'}`}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lavender-100 text-lavender-700">{item.link === '/student/path' ? <MessageCircleQuestion className="h-5 w-5" /> : <BookOpenCheck className="h-5 w-5" />}</span>
                        <span className="min-w-0"><span className="block break-words text-sm font-bold">{item.title}</span><span className="mt-1 block break-words text-xs text-stone-500">{item.body}</span></span>
                      </button>
                    ))}
                    {!notifications.length && <p className="p-5 text-center text-sm text-stone-500">{t('shell.emptyNotifications')}</p>}
                  </div>
                </div>
              )}

              {profileOpen && (
                <div className="absolute right-0 top-14 z-50 w-[min(16rem,calc(100vw-1rem))] rounded-3xl border border-stone-200 bg-paper p-2 shadow-2xl" role="menu">
                  <div className="border-b border-stone-200 p-3"><p className="font-bold">{displayName}</p><p className="text-xs text-stone-500">{user?.email || t('shell.emailUnavailable')}</p></div>
                  <button onClick={() => { navigate(role === 'admin' ? '/admin/settings' : role === 'student' ? '/student/settings' : '/teacher/settings'); setProfileOpen(false); }} className="mt-2 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-bold hover:bg-stone-100" role="menuitem"><Settings className="h-4 w-4" /> {t('shell.profileSettings')}</button>
                  <button onClick={leaveSession} className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-bold text-danger-700 hover:bg-danger-100" role="menuitem"><LogOut className="h-4 w-4" /> {t('shell.logout')}</button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <main id="dashboard-content" tabIndex="-1" className={immersiveAssistant ? 'h-dvh min-h-0 overflow-hidden p-0' : 'min-w-0 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10'}>
        <div key={pathname} className={`route-stage min-w-0 ${immersiveAssistant ? 'h-full min-h-0' : ''}`}><Outlet /></div>
      </main>
      <MobileNavigation role={role} />
      <AccessibilityMenu context={immersiveAssistant ? 'assistant' : 'app'} />
    </div>
  );
}
