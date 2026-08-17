import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Plus, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Dialog, StatusToast } from '../../shared/ui';
import { ClassHeatmap } from '../../features/teacher-dashboard/ClassHeatmap';
import { StudentTable } from '../../features/teacher-dashboard/StudentTable';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState({ classes: [], assignments: [] });
  const [students, setStudents] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '9A', grade: 9, subject_id: 'mathematics' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = async () => { setLoading(true); try { const response = await teacherApi.dashboard(); setData(response.data); if (response.data.classes?.[0]) { const studentResponse = await teacherApi.students(response.data.classes[0].id); setStudents(studentResponse.data.items || []); } else setStudents([]); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const createClass = async () => { setLoading(true); try { const response = await teacherApi.createClass(form); setCreateOpen(false); setToast(t('teacher.classCreated', { code: response.data.class.join_code })); await load(); } catch (requestError) { setError(requestError.message); setLoading(false); } };
  const currentClass = data.classes?.[0];
  const cards = [[Users, currentClass?.student_count || 0, t('teacher.students'), 'bg-lavender-100 text-lavender-700'], [TrendingUp, `${currentClass?.average_mastery || 0}%`, t('teacher.averageMastery'), 'bg-mint-100 text-mint-700'], [AlertTriangle, currentClass?.risk_students || 0, t('teacher.needHelp'), 'status-danger'], [BookOpenCheck, data.assignments?.length || 0, t('teacher.assignments'), 'status-warning']];

  return <div className="mx-auto max-w-7xl animate-rise"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('teacher.dashboard')}</p><h1 className="mt-2 break-words text-3xl font-extrabold sm:text-4xl">{t('teacher.greeting', { name: user?.name || t('teacher.defaultName') })}</h1><p className="mt-2 text-stone-600">{t('teacher.description')}</p></div><div className="flex flex-col gap-2 min-[420px]:flex-row"><Button variant="outline" onClick={() => setCreateOpen(true)}><Users className="h-5 w-5" /> {t('teacher.newClass')}</Button><Button onClick={() => navigate('/teacher/content/new')}><Plus className="h-5 w-5" /> {t('teacher.addMaterial')}</Button></div></div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {loading && !data.classes.length ? <Card className="mt-8 p-10 text-center">{t('teacher.loading')}</Card> : <><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([Icon, value, label, tone]) => <Card key={label} className="p-5"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-5 font-display text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-stone-500">{label}</p></Card>)}</div>
      {!currentClass ? <Card className="mt-6 p-10 text-center"><h2 className="text-2xl font-extrabold">{t('teacher.firstClass')}</h2><p className="mt-3 text-stone-500">{t('teacher.firstClassDescription')}</p><Button className="mt-6" onClick={() => setCreateOpen(true)}>{t('teacher.createClass')}</Button></Card> : <><div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card className="p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{currentClass.name}</p><h2 className="mt-2 text-2xl font-extrabold">{t('teacher.skillMap')}</h2></div><button onClick={() => navigate(`/teacher/classes/${currentClass.id}`)} className="min-h-11 rounded-xl px-3 text-sm font-bold text-lavender-700">{t('teacher.details')}</button></div><div className="mt-7"><ClassHeatmap students={students} /></div></Card><Card className="p-6 sm:p-8"><p className="eyebrow">{t('teacher.connection')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('teacher.classCode')}</h2><div className="mt-6 rounded-3xl bg-ink p-6 text-white"><p className="break-all font-display text-4xl font-semibold tracking-widest">{currentClass.join_code}</p><p className="mt-3 text-sm text-stone-400">{t('teacher.shareCode')}</p><Button className="mt-6 w-full" onClick={() => navigate('/teacher/assignments')}>{t('teacher.createAssignment')}</Button></div></Card></div><Card className="mt-6 p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">{t('teacher.participants')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('teacher.classStudents', { name: currentClass.name })}</h2></div><button onClick={() => navigate(`/teacher/classes/${currentClass.id}`)} className="min-h-11 rounded-xl px-3 text-sm font-bold text-lavender-700">{t('teacher.wholeClass')}</button></div><div className="mt-4"><StudentTable students={students} limit={4} /></div></Card></>}
    </>}
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('teacher.newClass')} description={t('teacher.newClassDescription')} footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('teacher.cancel')}</Button><Button loading={loading} onClick={createClass}>{t('teacher.create')}</Button></>}><div className="grid gap-4"><label className="field-label">{t('teacher.name')}<input className="field-control mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="field-label">{t('teacher.grade')}<input className="field-control mt-2" type="number" min="1" max="12" value={form.grade} onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })} /></label></div></Dialog><StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
