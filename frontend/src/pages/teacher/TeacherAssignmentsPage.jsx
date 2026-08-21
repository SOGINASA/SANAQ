import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Plus, Users } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';
import { adminContentApi } from '../../features/admin-content/adminContentApi';

const dateLocales = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };

export function TeacherAssignmentsPage() {
  const { locale, t } = useI18n();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', class_id: '', module_id: '', due_at: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [assignmentResponse, classResponse, moduleResponse] = await Promise.all([teacherApi.assignments(), teacherApi.classes(), adminContentApi.list()]);
      const publishedModules = (moduleResponse.data.items || []).filter((item) => item.status === 'published');
      setAssignments(assignmentResponse.data.items || []); setClasses(classResponse.data.items || []); setModules(publishedModules);
      setForm((current) => ({ ...current, class_id: current.class_id || classResponse.data.items?.[0]?.id || '', module_id: current.module_id || publishedModules[0]?.id || '' }));
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createAssignment = async () => {
    setLoading(true);
    try {
      await teacherApi.createAssignment({ ...form, due_at: form.due_at ? new Date(form.due_at).toISOString() : null, status: 'published' });
      setCreateOpen(false); setForm((current) => ({ ...current, title: '', due_at: '' })); setToast(t('assignmentsPage.saved')); await load();
    } catch (requestError) { setError(requestError.message); setLoading(false); }
  };

  return <div className="mx-auto max-w-6xl animate-rise">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('assignmentsPage.eyebrow')}</p><h1 className="page-title mt-3">{t('assignmentsPage.title')}</h1><p className="mt-3 text-stone-600">{t('assignmentsPage.description')}</p></div><Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)} disabled={!classes.length || !modules.length}><Plus className="h-5 w-5" /> {t('assignmentsPage.create')}</Button></div>
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <div className="mt-8 grid gap-5">{assignments.map((item) => <Card key={item.id} className="p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.progress === 100 ? 'bg-mint-100 text-mint-700' : 'bg-lavender-100 text-lavender-700'}`}>{item.progress === 100 ? <CheckCircle2 className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}</span><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-extrabold">{item.title}</h2><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500"><Users className="h-4 w-4" /> {item.class_name} · {item.due_at ? new Date(item.due_at).toLocaleDateString(dateLocales[locale]) : t('assignmentsPage.noDeadline')}</p><ProgressBar className="mt-4 max-w-2xl" value={item.progress} /></div><Button variant="ghost" className="w-full sm:w-auto" onClick={() => setSelected(item)}>{t('assignmentsPage.open')}</Button></div></Card>)}{!assignments.length && !loading && <Card className="state-empty p-10 text-center">{t('assignmentsPage.empty')}</Card>}</div>
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('assignmentsPage.newTitle')} description={t('assignmentsPage.newDescription')} footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('assignmentsPage.cancel')}</Button><Button loading={loading} disabled={!form.title || !form.class_id || !form.module_id} onClick={createAssignment}>{t('assignmentsPage.assign')}</Button></>}><div className="grid gap-4"><label className="field-label">{t('assignmentsPage.name')}<input className="field-control mt-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="field-label">{t('assignmentsPage.class')}<select className="field-control mt-2" value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">{t('assignmentsPage.module')}<select className="field-control mt-2" value={form.module_id} onChange={(event) => setForm({ ...form, module_id: event.target.value })}>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="field-label">{t('assignmentsPage.deadline')}<input type="datetime-local" className="field-control mt-2" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label></div></Dialog>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description={t('assignmentsPage.completed', { completed: selected?.completed_students || 0, total: selected?.total_students || 0 })} footer={<Button variant="ghost" onClick={() => setSelected(null)}>{t('assignmentsPage.close')}</Button>}><ProgressBar value={selected?.progress || 0} label={t('assignmentsPage.completion')} /></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
