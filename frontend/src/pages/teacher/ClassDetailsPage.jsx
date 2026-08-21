import { useCallback, useEffect, useState } from 'react';
import { ClipboardPlus, Copy, Download, Megaphone, Pin, Search } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { AssignmentProgressDetails, ClassFeed, classroomApi } from '../../features/classroom';
import { adminContentApi } from '../../features/admin-content/adminContentApi';
import { ClassHeatmap } from '../../features/teacher-dashboard/ClassHeatmap';
import { StudentTable } from '../../features/teacher-dashboard/StudentTable';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';
import { Button, Card, Dialog, Skeleton, StatusToast, Tabs } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

const EMPTY_ANNOUNCEMENT = { title: '', body: '', is_pinned: false };
const EMPTY_ASSIGNMENT = { title: '', module_id: '', due_at: '' };

export function ClassDetailsPage() {
  const { t } = useI18n();
  const { classId } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [weakSkills, setWeakSkills] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');
  const [search, setSearch] = useState('');
  const [announcement, setAnnouncement] = useState(EMPTY_ANNOUNCEMENT);
  const [assignment, setAssignment] = useState(EMPTY_ASSIGNMENT);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [details, studentResponse, analyticsResponse, weakResponse, feedResponse, moduleResponse] = await Promise.all([
        teacherApi.classDetails(classId), teacherApi.students(classId), teacherApi.analytics(classId),
        teacherApi.weakSkills(classId), classroomApi.feed(classId), adminContentApi.list(),
      ]);
      setClassroom(details.data.class);
      setStudents(studentResponse.data.items || []);
      setAnalytics(analyticsResponse.data);
      setWeakSkills(weakResponse.data.items || []);
      setAnnouncements(feedResponse.data.announcements || []);
      setAssignments(feedResponse.data.assignments || []);
      const availableModules = (moduleResponse.data.items || []).filter((item) => item.status === 'published');
      setModules(availableModules);
      setAssignment((current) => ({ ...current, module_id: current.module_id || availableModules[0]?.id || '' }));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    setActionLoading(true); setError('');
    try {
      const response = await classroomApi.announce(classId, announcement);
      setAnnouncements((items) => [response.data.announcement, ...items]);
      setAnnouncement(EMPTY_ANNOUNCEMENT);
      setToast(t('classWorkspace.announcementPublished'));
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };

  const createAssignment = async () => {
    setActionLoading(true); setError('');
    try {
      const response = await teacherApi.createAssignment({
        ...assignment, class_id: classId,
        due_at: assignment.due_at ? new Date(assignment.due_at).toISOString() : null,
        status: 'published',
      });
      setAssignments((items) => [response.data.assignment, ...items]);
      setAssignment((current) => ({ ...EMPTY_ASSIGNMENT, module_id: current.module_id }));
      setAssignmentOpen(false);
      setToast(t('classWorkspace.assignmentSent'));
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };

  const removeAnnouncement = async () => {
    if (!deleteTarget) return;
    setActionLoading(true); setError('');
    try {
      await classroomApi.removeAnnouncement(classId, deleteTarget.id);
      setAnnouncements((items) => items.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast(t('classWorkspace.announcementDeleted'));
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };

  const exportClass = () => {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const content = [t('classDetails.csv'), ...students.map((item) => [item.name, item.email, `${item.progress}%`, item.streak, item.focus].map(escape).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${classroom?.name || 'class'}-students.csv`;
    link.click(); URL.revokeObjectURL(link.href);
  };

  const copyCode = async () => {
    await navigator.clipboard?.writeText(classroom?.join_code || '');
    setToast(t('classDetails.copied'));
  };

  if (loading) return <div className="mx-auto max-w-7xl"><Skeleton lines={4} /><Skeleton className="mt-6" lines={8} /></div>;

  const priority = weakSkills[0];
  const tabs = [
    { value: 'feed', label: t('classWorkspace.feedTab') },
    { value: 'students', label: t('classWorkspace.studentsTab', { count: students.length }) },
    { value: 'analytics', label: t('classWorkspace.analyticsTab') },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-rise">
      {error && <div className="state-error mb-6" role="alert">{error}</div>}
      <Card className="overflow-hidden border-0 bg-ink p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">{t('classWorkspace.eyebrow')}</p><h1 className="mt-3 break-words text-3xl font-extrabold sm:text-4xl">{t('classWorkspace.title', { name: classroom?.name, grade: classroom?.grade })}</h1><p className="mt-3 text-sm text-stone-300">{t('classWorkspace.summary', { count: students.length })}</p></div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={copyCode} className="flex min-h-12 cursor-pointer items-center justify-between gap-5 rounded-2xl border border-stone-600 bg-stone-800 px-4 text-left transition hover:border-lavender-400"><span><span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">{t('classWorkspace.classCode')}</span><strong className="mt-0.5 block tracking-[0.16em]">{classroom?.join_code}</strong></span><Copy className="h-5 w-5 text-lime" /></button>
            <Button variant="outline" onClick={exportClass}><Download className="h-4 w-4" /> {t('classDetails.export')}</Button>
          </div>
        </div>
      </Card>

      <Tabs className="mt-6 w-full sm:w-fit" items={tabs} value={activeTab} onChange={setActiveTab} label={t('classWorkspace.sections')} />

      {activeTab === 'feed' && <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card className="p-5 sm:p-6"><form onSubmit={publishAnnouncement}>
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Megaphone className="h-5 w-5" /></span><div><h2 className="font-extrabold">{t('classWorkspace.announcementTitle')}</h2><p className="text-sm text-stone-500">{t('classWorkspace.announcementHint')}</p></div></div>
            <div className="mt-5 grid gap-3"><label className="field-label">{t('classWorkspace.heading')}<input className="field-control mt-2" maxLength="160" value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} placeholder={t('classWorkspace.headingPlaceholder')} /></label><label className="field-label">{t('classWorkspace.message')}<textarea className="field-control mt-2 min-h-28 resize-y" maxLength="5000" value={announcement.body} onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })} placeholder={t('classWorkspace.messagePlaceholder')} /></label></div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm font-semibold text-stone-600"><input type="checkbox" className="h-5 w-5 accent-lavender-600" checked={announcement.is_pinned} onChange={(event) => setAnnouncement({ ...announcement, is_pinned: event.target.checked })} /><Pin className="h-4 w-4" /> {t('classWorkspace.pin')}</label><Button type="submit" loading={actionLoading} disabled={!announcement.title.trim() || !announcement.body.trim()} className="w-full sm:w-auto">{t('classWorkspace.publish')}</Button></div>
          </form></Card>
          <div className="mb-4 mt-8 flex items-end justify-between gap-4"><div><p className="eyebrow">{t('classWorkspace.latest')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('classWorkspace.feedTitle')}</h2></div><span className="hidden text-sm text-stone-500 sm:block">{t('classWorkspace.publications', { count: announcements.length + assignments.length })}</span></div>
          <ClassFeed role="teacher" announcements={announcements} assignments={assignments} onOpenAssignment={setSelectedAssignment} onRemoveAnnouncement={setDeleteTarget} />
        </div>
        <Card className="p-5 xl:sticky xl:top-24"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-100 text-mint-700"><ClipboardPlus className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-extrabold">{t('classWorkspace.giveAssignment')}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{t('classWorkspace.giveAssignmentHint')}</p><Button className="mt-5 w-full" onClick={() => setAssignmentOpen(true)} disabled={!modules.length}>{t('classWorkspace.newAssignment')}</Button>{!modules.length && <p className="mt-3 text-xs leading-5 text-stone-500">{t('classWorkspace.modulesRequired')}</p>}</Card>
      </div>}

      {activeTab === 'students' && <Card className="mt-6 p-5 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">{t('classWorkspace.participants')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('classDetails.students')}</h2></div><label className="relative block"><span className="sr-only">{t('classDetails.search')}</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field-control pl-11 sm:w-72" placeholder={t('classDetails.searchPlaceholder')} /></label></div><div className="mt-5"><StudentTable students={students} search={search} /></div></Card>}

      {activeTab === 'analytics' && <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="min-w-0 p-6 sm:p-8"><h2 className="text-2xl font-extrabold">{t('classDetails.mastery')}</h2><div className="mt-7"><ClassHeatmap students={students} /></div></Card><Card className="p-6 sm:p-8"><p className="eyebrow">{t('classDetails.priority')}</p><h2 className="mt-2 text-2xl font-extrabold">{priority?.name || t('classDetails.noData')}</h2><p className="mt-4 text-stone-600">{t('classDetails.priorityText', { mastery: Math.round((priority?.mastery || 0) * 100), count: priority?.students_below_threshold || 0 })}</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-lavender-100 p-4"><p className="font-display text-2xl font-semibold">{analytics?.average_mastery || 0}%</p><p className="text-sm text-stone-600">{t('classDetails.average')}</p></div><div className="rounded-2xl bg-mint-100 p-4"><p className="font-display text-2xl font-semibold">{analytics?.active_students || 0}</p><p className="text-sm text-stone-600">{t('classDetails.active')}</p></div></div></Card></div>}

      <Dialog open={assignmentOpen} onClose={() => setAssignmentOpen(false)} title={t('classWorkspace.newAssignment')} description={t('classWorkspace.assignmentDescription')} footer={<><Button variant="ghost" onClick={() => setAssignmentOpen(false)}>{t('classWorkspace.cancel')}</Button><Button loading={actionLoading} disabled={!assignment.title.trim() || !assignment.module_id} onClick={createAssignment}>{t('classWorkspace.assign')}</Button></>}><div className="grid gap-4"><label className="field-label">{t('classWorkspace.name')}<input className="field-control mt-2" value={assignment.title} onChange={(event) => setAssignment({ ...assignment, title: event.target.value })} placeholder={t('classWorkspace.namePlaceholder')} /></label><label className="field-label">{t('classWorkspace.module')}<select className="field-control mt-2" value={assignment.module_id} onChange={(event) => setAssignment({ ...assignment, module_id: event.target.value })}>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="field-label">{t('classWorkspace.deadline')} <span className="font-normal text-stone-400">{t('classWorkspace.optional')}</span><input type="datetime-local" className="field-control mt-2" value={assignment.due_at} onChange={(event) => setAssignment({ ...assignment, due_at: event.target.value })} /></label></div></Dialog>
      <Dialog open={Boolean(selectedAssignment)} onClose={() => setSelectedAssignment(null)} title={selectedAssignment?.title || ''} description={t('assignmentProgress.summary', { completed: selectedAssignment?.completed_students || 0, started: selectedAssignment?.started_students || 0, total: selectedAssignment?.total_students || 0 })} footer={<Button variant="ghost" onClick={() => setSelectedAssignment(null)}>{t('classWorkspace.close')}</Button>}><AssignmentProgressDetails assignment={selectedAssignment} /></Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={t('classWorkspace.deleteTitle')} description={t('classWorkspace.deleteDescription')} footer={<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>{t('classWorkspace.cancel')}</Button><Button variant="danger" loading={actionLoading} onClick={removeAnnouncement}>{t('classWorkspace.delete')}</Button></>}><p className="rounded-2xl bg-stone-100 p-4 font-bold">{deleteTarget?.title}</p></Dialog>
      <StatusToast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
