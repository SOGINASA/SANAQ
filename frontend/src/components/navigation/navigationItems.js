import { Activity, BookOpen, ChartNoAxesColumnIncreasing, ClipboardCheck, FileCheck2, LayoutDashboard, LibraryBig, ListChecks, Map, MessageCircleQuestion, School, Settings, ShieldCheck, Users } from 'lucide-react';

export const navigationItems = {
  student: [
    ['nav.overview', '/student/dashboard', LayoutDashboard], ['nav.classroom', '/student/class', School], ['nav.path', '/student/path', BookOpen],
    ['nav.map', '/student/knowledge-map', Map], ['nav.assistant', '/student/assistant', MessageCircleQuestion], ['nav.progress', '/student/progress', ChartNoAxesColumnIncreasing],
    ['nav.achievements', '/student/achievements', ClipboardCheck], ['nav.settings', '/student/settings', Settings],
  ],
  teacher: [
    ['nav.classOverview', '/teacher/dashboard', LayoutDashboard], ['nav.content', '/teacher/content', LibraryBig], ['nav.assignments', '/teacher/assignments', ListChecks],
  ],
  admin: [
    ['nav.adminOverview', '/admin/dashboard', LayoutDashboard], ['nav.users', '/admin/users', Users], ['nav.content', '/admin/content', LibraryBig],
    ['nav.classes', '/admin/classes', School], ['nav.moderation', '/admin/moderation', FileCheck2], ['nav.system', '/admin/system', Activity], ['nav.audit', '/admin/audit', ShieldCheck],
  ],
};

export const getNavigationItems = (role) => navigationItems[role] || navigationItems.student;
