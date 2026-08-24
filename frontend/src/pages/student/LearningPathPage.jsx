import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, Flag, LockKeyhole, SlidersHorizontal, Sparkles, Target } from 'lucide-react';
import { Button, Card, Dialog, PageSkeleton, ProgressBar, StatusToast } from '../../shared/ui';
import { learningPathApi } from '../../features/learning-path/learningPathApi';
import { useI18n } from '../../shared/i18n/i18n';

const minutesByPace = { light: 15, balanced: 30, intensive: 45 };

export function LearningPathPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const paceOptions = [
    ['light', t('learningPath.pace.light'), t('learningPath.duration.light')],
    ['balanced', t('learningPath.pace.balanced'), t('learningPath.duration.balanced')],
    ['intensive', t('learningPath.pace.intensive'), t('learningPath.duration.intensive')],
  ];
  const [path, setPath] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [history, setHistory] = useState([]);
  const [pace, setPace] = useState('balanced');
  const [targetDate, setTargetDate] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadPath = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let pathId = searchParams.get('path');
      if (!pathId) {
        const list = await learningPathApi.list();
        pathId = list.data.items?.[0]?.id;
      }
      if (!pathId) throw new Error(t('learningPath.noPathError'));
      const [pathResponse, stepResponse, historyResponse] = await Promise.all([learningPathApi.get(pathId), learningPathApi.nextStep(pathId), learningPathApi.history(pathId)]);
      setPath(pathResponse.data.learning_path);
      setPace(pathResponse.data.learning_path.pace);
      setTargetDate(pathResponse.data.learning_path.goal_projection?.target_date || '');
      setNextStep(stepResponse.data.step);
      setHistory(historyResponse.data.items || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams, t]);

  useEffect(() => { loadPath(); }, [loadPath]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await learningPathApi.update(path.id, { pace, target_date: targetDate || null });
      const recalculated = await learningPathApi.recalculate(path.id);
      await learningPathApi.previewStudyPlan({
        subject_id: recalculated.data.learning_path.subject_id || 'mathematics',
        weekday_minutes: minutesByPace[pace],
        weekend_minutes: Math.min(minutesByPace[pace] + 15, 60),
        max_skills: 20,
      });
      setPath(recalculated.data.learning_path);
      setSettingsOpen(false);
      setStatus(t('learningPath.saved'));
      await loadPath();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !path) return <PageSkeleton cards={3} label={t('learningPath.loading')} />;

  return <div className="mx-auto max-w-6xl animate-rise">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('learningPath.eyebrow')}</p><h1 className="page-title mt-3">{path?.title || t('learningPath.fallbackTitle')}</h1><p className="mt-3 text-stone-600">{t('learningPath.description')}</p></div>{path && <Button className="w-full whitespace-nowrap sm:w-auto sm:min-w-[210px] sm:shrink-0" variant="outline" onClick={() => setSettingsOpen(true)}><SlidersHorizontal className="h-5 w-5 shrink-0" /> {t('learningPath.configure')}</Button>}</div>
    {error && <div className="state-error mt-6" role="alert">{error}<div className="mt-3"><Button size="sm" onClick={() => navigate('/student/onboarding')}>{t('learningPath.startSetup')}</Button></div></div>}
    {path && <>
      <Card className="mt-7 p-6 sm:p-8"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender-100 text-lavender-700"><Clock3 className="h-5 w-5" /></span><div><h2 className="text-xl font-extrabold">{t('learningPath.historyTitle')}</h2><p className="text-sm text-stone-500">{t('learningPath.historyDescription')}</p></div></div>{history.length ? <div className="mt-5 grid gap-3">{history.map((event) => <div key={event.id} className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-lavender-500" /><div className="min-w-0"><strong className="block text-sm">{t(`learningPath.history.${event.type}`)}</strong><span className="mt-1 block text-xs text-stone-500">{new Date(event.occurred_at).toLocaleString()}</span></div></div>)}</div> : <p className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">{t('learningPath.historyEmpty')}</p>}</Card>
      {path.goal_projection && <Card className="mt-7 overflow-hidden border-lavender-200 bg-lavender-50 p-6 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lavender-700"><Flag className="h-4 w-4" />{t('learningPath.goal')}</p><h2 className="mt-2 break-words text-2xl font-extrabold">{path.goal_projection.title}</h2><p className="mt-2 text-sm text-stone-600">{t('learningPath.goalSummary', { remaining: path.goal_projection.remaining_steps || 0, total: path.goal_projection.total_steps || 0, weekly: path.goal_projection.steps_per_week || 0 })}</p></div><div className="grid shrink-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2"><div className="rounded-2xl bg-paper p-4"><span className="flex items-center gap-2 text-xs text-stone-500"><CalendarDays className="h-4 w-4" />{t('learningPath.forecast')}</span><strong className="mt-1 block">{path.goal_projection.estimated_completion_date ? new Date(`${path.goal_projection.estimated_completion_date}T12:00:00`).toLocaleDateString() : '—'}</strong></div><div className={`rounded-2xl p-4 ${path.goal_projection.status === 'at_risk' ? 'bg-danger-100 text-danger-700' : 'bg-mint-100 text-mint-700'}`}><span className="text-xs">{t('learningPath.goalStatus')}</span><strong className="mt-1 block">{t(`learningPath.status.${path.goal_projection.status || 'on_track'}`)}</strong></div></div></div></Card>}
      <Card className="mt-7 overflow-hidden"><div className="grid gap-6 bg-ink p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold text-lime"><Sparkles className="h-4 w-4 shrink-0" /> {t('learningPath.nextStep')}</div><h2 className="mt-3 break-words text-2xl font-extrabold">{nextStep?.skill_name || t('learningPath.todayComplete')}</h2><p className="mt-3 max-w-2xl break-words text-sm leading-6 text-stone-300">{nextStep?.reason || t('learningPath.allComplete')}</p><div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-stone-300"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-lime" /> {path.weekday_minutes} {t('learningPath.minutesWeekday')}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-lime" /> {path.schedule?.scheduled_days || 0} {t('learningPath.studyDays')}</span></div></div>{nextStep && <Button className="w-full lg:w-auto" size="lg" onClick={() => navigate(nextStep.module_id ? `/student/learn/${nextStep.module_id}?path=${path.id}` : `/student/task/${nextStep.task_id}?path=${path.id}`)}>{t('learningPath.startTask')} <ArrowRight className="h-5 w-5" /></Button>}</div><div className="p-6 sm:p-8"><ProgressBar value={Math.round((path.progress || 0) * 100)} label={t('learningPath.progress')} /></div></Card>
      {path.steps?.length ? <div className="learning-rail mt-7 grid gap-4">{path.steps.map((step, index) => { const done = step.status === 'completed'; const available = step.status === 'available'; return <Card key={step.id} style={{ '--step-delay': `${index * 55}ms` }} className={`learning-step ${available ? 'learning-step--available border-lavender-300 bg-lavender-50' : ''} p-5`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className={`relative z-[1] grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? 'bg-mint-100 text-mint-700' : available ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-400'}`}>{done ? <Check className="h-5 w-5" /> : available ? <Target className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">{t('learningPath.step', { number: step.order })}</p><h2 className="mt-1 break-words text-lg font-extrabold">{step.skill_name}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-stone-500"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {step.planned_minutes || path.weekday_minutes} {t('learningPath.minutesShort')}</span>{step.planned_date && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${step.planned_date}T12:00:00`))}</span>}</div><p className="mt-2 break-words text-sm text-stone-500">{step.reason}</p></div>{available && <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate(step.module_id ? `/student/learn/${step.module_id}?path=${path.id}` : `/student/task/${step.task_id}?path=${path.id}`)}>{t('learningPath.open')}</Button>}</div></Card>; })}</div> : <Card className="mt-7 p-6 text-center sm:p-8"><h2 className="text-xl font-extrabold">{t('learningPath.emptyTitle')}</h2><p className="mx-auto mt-2 max-w-xl text-stone-600">{t('learningPath.emptyText')}</p><Button className="mt-5" onClick={loadPath}>{t('learningPath.retry')}</Button></Card>}
    </>}
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('learningPath.dialogTitle')} description={t('learningPath.dialogDescription')} footer={<><Button variant="ghost" onClick={() => setSettingsOpen(false)}>{t('learningPath.cancel')}</Button><Button loading={loading} onClick={saveSettings}>{t('learningPath.save')}</Button></>}><div className="grid gap-3"><label className="field-label">{t('learningPath.targetDate')}<input type="date" className="field-control mt-2" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>{paceOptions.map(([value, label, duration]) => <label key={value} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 ${pace === value ? 'border-lavender-500 bg-lavender-50' : 'border-stone-200'}`}><input type="radio" name="pace" checked={pace === value} onChange={() => setPace(value)} /><span className="min-w-0"><strong className="break-words">{label}</strong><span className="ml-2 text-sm text-stone-500">{duration}</span></span></label>)}</div></Dialog>
    <StatusToast message={status} onClose={() => setStatus('')} />
  </div>;
}
