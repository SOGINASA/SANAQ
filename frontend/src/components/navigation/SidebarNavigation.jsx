import { NavLink } from 'react-router-dom';
import { Activity, BookOpen, ChartNoAxesColumnIncreasing, ClipboardCheck, FileCheck2, LayoutDashboard, Map, MessageCircleQuestion, Settings, LibraryBig, ListChecks, School, ShieldCheck, Users } from 'lucide-react';
import { Brand } from '../layout/Header';
import { cn } from '../../shared/lib/cn';
import { useI18n } from '../../shared/i18n/i18n';

const studentItems = [['nav.overview', '/student/dashboard', LayoutDashboard], ['nav.classroom', '/student/class', School], ['nav.path', '/student/path', BookOpen], ['nav.map', '/student/knowledge-map', Map], ['nav.assistant', '/student/assistant', MessageCircleQuestion], ['nav.progress', '/student/progress', ChartNoAxesColumnIncreasing], ['nav.achievements', '/student/achievements', ClipboardCheck], ['nav.settings', '/student/settings', Settings]];
const teacherItems = [['nav.classOverview', '/teacher/dashboard', LayoutDashboard], ['nav.content', '/teacher/content', LibraryBig], ['nav.assignments', '/teacher/assignments', ListChecks]];
const adminItems = [['nav.adminOverview', '/admin/dashboard', LayoutDashboard], ['nav.users', '/admin/users', Users], ['nav.classes', '/admin/classes', School], ['nav.content', '/admin/content', LibraryBig], ['nav.moderation', '/admin/moderation', FileCheck2], ['nav.system', '/admin/system', Activity], ['nav.audit', '/admin/audit', ShieldCheck]];

export function SidebarNavigation({ role = 'student' }) {
  const { t } = useI18n();
  const items = role === 'admin' ? adminItems : role === 'teacher' ? teacherItems : studentItems;
  const areaKey = role === 'admin' ? 'nav.adminArea' : role === 'teacher' ? 'nav.teacherArea' : 'nav.studentArea';
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-stone-200 bg-paper p-5 lg:flex lg:flex-col"><Brand /><p className="mb-3 mt-10 px-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-400">{t(areaKey)}</p><nav className="flex flex-1 flex-col gap-1" aria-label={t('nav.cabinet')}>{items.map(([key, to, Icon]) => <NavLink key={to} to={to} className={({ isActive }) => cn('flex min-h-12 items-center gap-3 rounded-2xl px-4 font-semibold text-stone-600 transition hover:bg-lavender-50 hover:text-lavender-700', isActive && 'bg-lavender-100 text-lavender-700')}><Icon className="h-5 w-5" aria-hidden="true" /> {t(key)}</NavLink>)}</nav>{role === 'student' && <NavLink to="/student/assistant" className="rounded-3xl bg-ink p-5 text-white transition hover:-translate-y-0.5 hover:bg-stone-800"><p className="text-xs font-bold uppercase tracking-widest text-lime">{t('companion.eyebrow')}</p><p className="mt-2 text-sm text-stone-300">{t('companion.text')}</p></NavLink>}</aside>;
}
