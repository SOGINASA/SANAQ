import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, MoreHorizontal, School, Trash2, Users } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast } from '../../shared/ui';

export function AdminClassesPage() {
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
    setLoading(true); setError('');
    try { const [classResponse, teacherResponse] = await Promise.all([adminApi.classes(), adminApi.users({ role: 'teacher' })]); setClasses(classResponse.data.items || []); setTeachers(teacherResponse.data.items || []); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setActionLoading(true); setError('');
    try { await adminApi.updateClass(editor.id, { name: editor.name, grade: Number(editor.grade), teacher_id: editor.teacher_id }); setEditor(null); setSelected(null); setToast('Класс обновлён'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const remove = async () => {
    setActionLoading(true); setError('');
    try { await adminApi.removeClass(selected.id); setDeleteOpen(false); setSelected(null); setToast('Класс удалён'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow="Учебные пространства" title="Классы платформы" description="Контролируйте владельца, параллель и состав созданных учителями классов." />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    {loading && !classes.length ? <Skeleton className="mt-7" lines={10} /> : <div className="mt-7 grid gap-4 lg:grid-cols-2">{classes.map((item) => <Card key={item.id} className="p-5 sm:p-6"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><School className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-stone-400">{item.grade} класс · {item.subject_id}</p><h2 className="mt-1 break-words text-xl font-extrabold">{item.name}</h2><p className="mt-2 break-words text-sm text-stone-500">Учитель: {item.teacher_name}</p></div><button onClick={() => setSelected(item)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 hover:bg-stone-100" aria-label={`Действия с классом ${item.name}`}><MoreHorizontal className="h-5 w-5" /></button></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-stone-100 p-3"><Users className="h-4 w-4 text-stone-500" /><strong className="mt-2 block tabular-nums">{item.student_count}</strong><span className="text-xs text-stone-500">учеников</span></div><div className="rounded-2xl bg-stone-100 p-3"><BookOpenCheck className="h-4 w-4 text-stone-500" /><strong className="mt-2 block tabular-nums">{item.assignment_count}</strong><span className="text-xs text-stone-500">заданий</span></div><div className="rounded-2xl bg-ink p-3 text-white"><span className="text-xs text-stone-400">Код</span><strong className="mt-3 block break-all text-sm tracking-wider">{item.join_code}</strong></div></div></Card>)}{!classes.length && <Card className="p-12 text-center"><School className="mx-auto h-8 w-8 text-stone-400" /><h2 className="mt-4 text-xl font-extrabold">Классов пока нет</h2></Card>}</div>}
    <Dialog open={Boolean(selected) && !editor && !deleteOpen} onClose={() => setSelected(null)} title={selected?.name || ''} description={`${selected?.grade || ''} класс · ${selected?.student_count || 0} учеников`} footer={<Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button>}><div className="grid gap-3"><button onClick={() => setEditor({ ...selected })} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-lavender-50"><School className="h-5 w-5 text-lavender-600" /> Изменить класс и учителя</button><button onClick={() => setDeleteOpen(true)} className="flex min-h-20 items-center gap-4 rounded-2xl border border-danger-200 p-4 text-left font-bold text-danger-700 hover:bg-danger-100"><Trash2 className="h-5 w-5" /> Удалить класс</button></div></Dialog>
    <Dialog open={Boolean(editor)} onClose={() => setEditor(null)} title="Настройки класса" footer={<><Button variant="ghost" onClick={() => setEditor(null)}>Отмена</Button><Button loading={actionLoading} disabled={!editor?.name?.trim() || !editor?.teacher_id} onClick={save}>Сохранить</Button></>}>{editor && <div className="grid gap-4"><label className="field-label">Название<input className="field-control mt-2" value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label><label className="field-label">Параллель<select className="field-control mt-2" value={editor.grade} onChange={(event) => setEditor({ ...editor, grade: Number(event.target.value) })}>{[7, 8, 9, 10, 11, 12].map((grade) => <option key={grade} value={grade}>{grade} класс</option>)}</select></label><label className="field-label">Учитель<select className="field-control mt-2" value={editor.teacher_id} onChange={(event) => setEditor({ ...editor, teacher_id: event.target.value })}>{teachers.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.email}</option>)}</select></label></div>}</Dialog>
    <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить класс безвозвратно?" description="Будут удалены объявления, назначения и связи с учениками. Учебные аккаунты останутся." footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Отмена</Button><Button variant="danger" loading={actionLoading} onClick={remove}>Удалить класс</Button></>}><p className="rounded-2xl bg-danger-100 p-4 font-bold text-danger-700">{selected?.name}</p></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
