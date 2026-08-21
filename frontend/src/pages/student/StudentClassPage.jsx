import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, GraduationCap, School, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClassFeed, classroomApi } from '../../features/classroom';
import { Button, Card, Skeleton } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function StudentClassPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState(classId || '');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async (id) => {
    if (!id) { setFeed(null); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const response = await classroomApi.feed(id);
      setFeed(response.data);
      setSelectedId(id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    classroomApi.studentClasses()
      .then(async (response) => {
        if (!active) return;
        const items = response.data.items || [];
        setClasses(items);
        await loadFeed(classId || items[0]?.id || '');
      })
      .catch((requestError) => { if (active) { setError(requestError.message); setLoading(false); } });
    return () => { active = false; };
  }, [classId, loadFeed]);

  const openAssignment = (assignment) => {
    if (assignment.task_id) navigate(`/student/task/${assignment.task_id}`);
    else if (assignment.module_id) navigate(`/student/learn/${assignment.module_id}`);
  };

  if (loading && !feed) return <div className="mx-auto max-w-5xl"><Skeleton lines={4} /><Skeleton className="mt-8" lines={8} /></div>;
  if (!classes.length && !loading) return <div className="mx-auto max-w-3xl animate-rise"><Card className="p-8 text-center sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-100 text-lavender-700"><School className="h-7 w-7" /></span><h1 className="mt-6 text-3xl font-extrabold">{t('studentClass.emptyTitle')}</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-stone-500">{t('studentClass.emptyText')}</p><Button className="mt-7" onClick={() => navigate('/student/settings')}>{t('studentClass.enterCode')} <ArrowRight className="h-5 w-5" /></Button></Card></div>;

  const classroom = feed?.class;
  const publicationCount = (feed?.announcements?.length || 0) + (feed?.assignments?.length || 0);
  return <div className="mx-auto max-w-5xl animate-rise">
    {error && <div className="state-error mb-6" role="alert">{error}</div>}
    <Card className="overflow-hidden border-0 bg-ink p-6 text-white sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">{t('studentClass.myClass')}</p><h1 className="mt-3 break-words text-3xl font-extrabold sm:text-4xl">{classroom?.name}</h1><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-300"><span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 shrink-0" /> {t('studentClass.classSummary', { grade: classroom?.grade })}</span><span className="flex min-w-0 items-center gap-2"><Users className="h-4 w-4 shrink-0" /><span className="break-words">{classroom?.teacher_name}</span></span></div></div>{classes.length > 1 && <label className="text-sm font-bold text-stone-300">{t('studentClass.chooseClass')}<select className="mt-2 block min-h-12 w-full rounded-2xl border border-stone-600 bg-stone-800 px-4 text-white sm:w-64" value={selectedId} onChange={(event) => navigate(`/student/classes/${event.target.value}`)}>{classes.map((item) => <option key={item.id} value={item.id}>{t('studentClass.option', { name: item.name, grade: item.grade })}</option>)}</select></label>}</div></Card>
    <div className="mb-5 mt-8 flex items-end justify-between gap-4"><div><p className="eyebrow">{t('studentClass.latest')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('studentClass.feed')}</h2></div><span className="hidden text-sm text-stone-500 sm:block">{t('studentClass.publications', { count: publicationCount })}</span></div>
    <ClassFeed announcements={feed?.announcements} assignments={feed?.assignments} onOpenAssignment={openAssignment} />
  </div>;
}
