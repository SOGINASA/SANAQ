import { useEffect, useState } from 'react';
import { BookOpen, ClipboardPlus, MoreHorizontal, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { teacherApi } from '../teacher-dashboard/teacherApi';
import { adminContentApi } from './adminContentApi';
import { useAuthStore } from '../auth/authStore';

const EMPTY_ASSIGNMENT = { title: '', class_id: '', due_at: '' };

export function ContentList() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const contentBase = role === 'admin' ? '/admin/content' : '/teacher/content';
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [classes, setClasses] = useState([]);
  const [assignment, setAssignment] = useState(EMPTY_ASSIGNMENT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminContentApi.list();
      setItems(response.data.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const publish = async () => {
    setLoading(true);
    try {
      await adminContentApi.publish(selected.id);
      setSelected(null);
      setToast(t('contentLibrary.publishedToast'));
      await load();
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  };

  const remove = async () => {
    setLoading(true);
    try {
      await adminContentApi.remove(selected.id);
      setSelected(null);
      setToast(t('contentLibrary.removedToast'));
      await load();
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  };

  const openAssignment = async (module) => {
    setLoading(true);
    setError('');
    try {
      const response = await teacherApi.classes();
      const availableClasses = response.data.items || [];
      setClasses(availableClasses);
      setAssignmentTarget(module);
      setAssignment({ title: module.title, class_id: availableClasses[0]?.id || '', due_at: '' });
      setSelected(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const assignToClass = async () => {
    if (!assignmentTarget || !assignment.title.trim() || !assignment.class_id) return;
    setLoading(true);
    setError('');
    try {
      await teacherApi.createAssignment({
        title: assignment.title.trim(),
        class_id: assignment.class_id,
        module_id: assignmentTarget.id,
        due_at: assignment.due_at ? new Date(assignment.due_at).toISOString() : null,
        status: 'published',
      });
      setAssignmentTarget(null);
      setAssignment(EMPTY_ASSIGNMENT);
      setToast(t('contentLibrary.assignedToast'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return <div>
    {error && <div className="state-error mb-5" role="alert">{error}</div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">{t('contentLibrary.modules')}</h2><p className="mt-1 text-sm text-stone-500">{t('contentLibrary.modulesDescription')}</p></div><Button className="w-full sm:w-auto" onClick={() => navigate(`${contentBase}/new`)}><Plus className="h-5 w-5" /> {t('contentLibrary.newModule')}</Button></div>
    <div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><BookOpen className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="break-words font-extrabold">{item.title}</p><p className="mt-1 break-words text-sm text-stone-500">{item.description} · {t('contentLibrary.version', { version: item.version })}</p></div><div className="flex items-center justify-between gap-3 sm:contents"><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${item.status === 'published' ? 'bg-mint-100 text-mint-700' : 'bg-stone-100 text-stone-600'}`}>{t(item.status === 'published' ? 'contentLibrary.published' : 'contentLibrary.draft')}</span><button onClick={() => setSelected(item)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-stone-100" aria-label={t('contentLibrary.actions', { title: item.title })}><MoreHorizontal className="h-5 w-5" /></button></div></div>)}{!items.length && !loading && <p className="py-8 text-center text-sm text-stone-500">{t('contentLibrary.empty')}</p>}</div>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description={t('contentLibrary.dialogDescription')} footer={<Button variant="ghost" onClick={() => setSelected(null)}>{t('contentLibrary.close')}</Button>}><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => navigate(`${contentBase}/${selected.id}/edit`)} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold transition hover:bg-lavender-50"><Pencil className="h-5 w-5 text-lavender-600" /> {t('contentLibrary.edit')}</button>{selected?.status !== 'published' && <button onClick={publish} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold transition hover:bg-stone-100"><Send className="h-5 w-5 text-lavender-600" /> {t('contentLibrary.publish')}</button>}{role === 'teacher' && selected?.status === 'published' && <button onClick={() => openAssignment(selected)} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold transition hover:bg-mint-50"><ClipboardPlus className="h-5 w-5 text-mint-700" /> {t('contentLibrary.assignToClass')}</button>}<button onClick={remove} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-danger-200 p-4 text-left font-bold text-danger-700 transition hover:bg-danger-100"><Trash2 className="h-5 w-5" /> {t('contentLibrary.delete')}</button></div></Dialog>
    <Dialog
      open={Boolean(assignmentTarget)}
      onClose={() => { setAssignmentTarget(null); setAssignment(EMPTY_ASSIGNMENT); }}
      title={t('contentLibrary.assignTitle')}
      description={t('contentLibrary.assignDescription')}
      footer={<><Button variant="ghost" onClick={() => setAssignmentTarget(null)}>{t('contentLibrary.cancel')}</Button><Button loading={loading} disabled={!assignment.title.trim() || !assignment.class_id} onClick={assignToClass}>{t('contentLibrary.assign')}</Button></>}
    >
      {classes.length ? <div className="grid gap-4">
        <label className="field-label">{t('contentLibrary.assignmentName')}<input className="field-control mt-2" value={assignment.title} onChange={(event) => setAssignment({ ...assignment, title: event.target.value })} /></label>
        <label className="field-label">{t('contentLibrary.class')}<select className="field-control mt-2" value={assignment.class_id} onChange={(event) => setAssignment({ ...assignment, class_id: event.target.value })}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field-label">{t('contentLibrary.deadline')} <span className="font-normal text-stone-400">{t('contentLibrary.optional')}</span><input type="datetime-local" className="field-control mt-2" value={assignment.due_at} onChange={(event) => setAssignment({ ...assignment, due_at: event.target.value })} /></label>
      </div> : <p className="rounded-2xl bg-stone-100 p-5 text-sm text-stone-600">{t('contentLibrary.noClasses')}</p>}
    </Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
