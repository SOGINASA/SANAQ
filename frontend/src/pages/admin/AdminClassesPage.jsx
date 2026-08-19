import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, MoreHorizontal, School, Trash2, Users } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function AdminClassesPage() {
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classResponse, teacherResponse] = await Promise.all([adminApi.classes(), adminApi.allUsers({ role: 'teacher' })]);
      if (!Array.isArray(classResponse.data.items) || !Array.isArray(teacherResponse.data.items)) throw new Error(t('adminRuntime.classesInvalid')); setClasses(classResponse.data.items);
      setTeachers(teacherResponse.data.items);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setActionLoading(true);
    setError('');
    try {
      await adminApi.updateClass(editor.id, { name: editor.name, grade: Number(editor.grade), teacher_id: editor.teacher_id });
      setEditor(null);
      setSelected(null);
      setToast(t('adminClasses.updated'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const remove = async () => {
    setActionLoading(true);
    setError('');
    try {
      await adminApi.removeClass(selected.id);
      setDeleteOpen(false);
      setSelected(null);
      setToast(t('adminClasses.removed'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };

  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow={t('adminClasses.eyebrow')} title={t('adminClasses.title')} description={t('adminClasses.description')} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    {loading && !classes.length ? <Skeleton className="mt-7" lines={10} /> : <div className="mt-7 grid gap-4 lg:grid-cols-2">{classes.map((item) => <Card key={item.id} className="p-5 sm:p-6"><div className="flex min-w-0 items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><School className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="break-words text-xs font-bold uppercase tracking-wider text-stone-400">{t('adminClasses.gradeSubject', { grade: item.grade, subject: item.subject_id })}</p><h2 className="mt-1 break-words text-xl font-extrabold">{item.name}</h2><p className="mt-2 break-words text-sm text-stone-500">{t('adminClasses.teacher', { name: item.teacher_name })}</p></div><button onClick={() => setSelected(item)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 hover:bg-stone-100" aria-label={t('adminClasses.actions', { name: item.name })}><MoreHorizontal className="h-5 w-5" /></button></div><div className="mt-5 grid grid-cols-3 gap-2"><Metric icon={Users} value={item.student_count} label={t('adminClasses.students')} /><Metric icon={BookOpenCheck} value={item.assignment_count} label={t('adminClasses.assignments')} /><div className="min-w-0 rounded-2xl bg-ink p-3 text-white"><span className="text-xs text-stone-400">{t('adminClasses.code')}</span><strong className="mt-3 block break-all text-sm tracking-wider">{item.join_code}</strong></div></div></Card>)}{!classes.length && <Card className="p-12 text-center"><School className="mx-auto h-8 w-8 text-stone-400" /><h2 className="mt-4 text-xl font-extrabold">{t('adminClasses.empty')}</h2></Card>}</div>}

    <Dialog open={Boolean(selected) && !editor && !deleteOpen} onClose={() => setSelected(null)} title={selected?.name || ''} description={t('adminClasses.summary', { grade: selected?.grade || '', count: selected?.student_count || 0 })} footer={<Button variant="ghost" onClick={() => setSelected(null)}>{t('adminClasses.close')}</Button>}><div className="grid gap-3"><button onClick={() => setEditor({ ...selected })} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-lavender-50"><School className="h-5 w-5 shrink-0 text-lavender-600" /> {t('adminClasses.edit')}</button><button onClick={() => setDeleteOpen(true)} className="flex min-h-20 items-center gap-4 rounded-2xl border border-danger-200 p-4 text-left font-bold text-danger-700 hover:bg-danger-100"><Trash2 className="h-5 w-5 shrink-0" /> {t('adminClasses.delete')}</button></div></Dialog>
    <Dialog open={Boolean(editor)} onClose={() => setEditor(null)} title={t('adminClasses.settings')} footer={<><Button variant="ghost" onClick={() => setEditor(null)}>{t('adminClasses.cancel')}</Button><Button loading={actionLoading} disabled={!editor?.name?.trim() || !editor?.teacher_id} onClick={save}>{t('adminClasses.save')}</Button></>}>{editor && <div className="grid gap-4"><label className="field-label">{t('adminClasses.name')}<input className="field-control mt-2" value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label><label className="field-label">{t('adminClasses.grade')}<select className="field-control mt-2" value={editor.grade} onChange={(event) => setEditor({ ...editor, grade: Number(event.target.value) })}>{[7, 8, 9, 10, 11, 12].map((grade) => <option key={grade} value={grade}>{t('adminClasses.gradeOption', { grade })}</option>)}</select></label><label className="field-label">{t('adminClasses.teacherLabel')}<select className="field-control mt-2" value={editor.teacher_id} onChange={(event) => setEditor({ ...editor, teacher_id: event.target.value })}>{teachers.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label></div>}</Dialog>
    <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('adminClasses.deleteTitle')} description={t('adminClasses.deleteDescription')} footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t('adminClasses.cancel')}</Button><Button variant="danger" loading={actionLoading} onClick={remove}>{t('adminClasses.delete')}</Button></>}><p className="rounded-2xl bg-danger-100 p-4 font-bold text-danger-700">{selected?.name}</p></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}

function Metric({ icon: Icon, value, label }) {
  return <div className="min-w-0 rounded-2xl bg-stone-100 p-3"><Icon className="h-4 w-4 text-stone-500" /><strong className="mt-2 block tabular-nums">{value}</strong><span className="block break-words text-xs text-stone-500">{label}</span></div>;
}
