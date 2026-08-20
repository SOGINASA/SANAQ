import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LockKeyhole, SlidersHorizontal, Sparkles, Target } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';
import { learningPathApi } from '../../features/learning-path/learningPathApi';
import { useI18n } from '../../shared/i18n/i18n';

const minutesByPace = { light: 15, balanced: 20, intensive: 40 };

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
  const [pace, setPace] = useState('balanced');
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
      const [pathResponse, stepResponse] = await Promise.all([learningPathApi.get(pathId), learningPathApi.nextStep(pathId)]);
      setPath(pathResponse.data.learning_path);
      setPace(pathResponse.data.learning_path.pace);
      setNextStep(stepResponse.data.step);
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
      await learningPathApi.update(path.id, { pace });
      const recalculated = await learningPathApi.recalculate(path.id);
      await learningPathApi.previewStudyPlan({ subject_id: recalculated.data.learning_path.subject_id || 'mathematics', weekday_minutes: minutesByPace[pace], weekend_minutes: Math.min(minutesByPace[pace] + 15, 60), max_skills: 20 });
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

  if (loading && !path) return <div className="mx-auto max-w-6xl py-16 text-center font-bold">{t('learningPath.loading')}</div>;

  return <div className="mx-auto max-w-6xl animate-rise">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('learningPath.eyebrow')}</p><h1 className="page-title mt-3">{path?.title || t('learningPath.fallbackTitle')}</h1><p className="mt-3 text-stone-600">{t('learningPath.description')}</p></div>{path && <Button variant="outline" onClick={() => setSettingsOpen(true)}><SlidersHorizontal className="h-5 w-5" /> {t('learningPath.configure')}</Button>}</div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}<div className="mt-3"><Button size="sm" onClick={() => navigate('/student/onboarding')}>{t('learningPath.startSetup')}</Button></div></div>}
    {path && <>
      <Card className="mt-7 overflow-hidden"><div className="grid gap-6 bg-ink p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold text-lime"><Sparkles className="h-4 w-4 shrink-0" /> {t('learningPath.nextStep')}</div><h2 className="mt-3 break-words text-2xl font-extrabold">{nextStep?.skill_name || t('learningPath.todayComplete')}</h2><p className="mt-3 max-w-2xl break-words text-sm leading-6 text-stone-300">{nextStep?.reason || t('learningPath.allComplete')}</p></div>{nextStep && <Button className="w-full lg:w-auto" size="lg" onClick={() => navigate(`/student/task/${nextStep.task_id}?path=${path.id}`)}>{t('learningPath.startTask')} <ArrowRight className="h-5 w-5" /></Button>}</div><div className="p-6 sm:p-8"><ProgressBar value={Math.round((path.progress || 0) * 100)} label={t('learningPath.progress')} /></div></Card>
      <div className="learning-rail mt-7 grid gap-4">{path.steps?.map((step, index) => { const done = step.status === 'completed'; const available = step.status === 'available'; return <Card key={step.id} style={{ '--step-delay': `${index * 90}ms` }} className={`learning-step ${available ? 'learning-step--available border-lavender-300 bg-lavender-50' : ''} p-5`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className={`relative z-[1] grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? 'bg-mint-100 text-mint-700' : available ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-400'}`}>{done ? <Check className="h-5 w-5" /> : available ? <Target className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">{t('learningPath.step', { number: step.order })}</p><h2 className="mt-1 break-words text-lg font-extrabold">{step.skill_name}</h2><p className="mt-1 break-words text-sm text-stone-500">{step.reason}</p></div>{available && <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate(`/student/task/${step.task_id}?path=${path.id}`)}>{t('learningPath.open')}</Button>}</div></Card>; })}</div>
    </>}
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('learningPath.dialogTitle')} description={t('learningPath.dialogDescription')} footer={<><Button variant="ghost" onClick={() => setSettingsOpen(false)}>{t('learningPath.cancel')}</Button><Button loading={loading} onClick={saveSettings}>{t('learningPath.save')}</Button></>}><div className="grid gap-3">{paceOptions.map(([value, label, duration]) => <label key={value} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 ${pace === value ? 'border-lavender-500 bg-lavender-50' : 'border-stone-200'}`}><input type="radio" name="pace" checked={pace === value} onChange={() => setPace(value)} /><span className="min-w-0"><strong className="break-words">{label}</strong><span className="ml-2 text-sm text-stone-500">{duration}</span></span></label>)}</div></Dialog>
    <StatusToast message={status} onClose={() => setStatus('')} />
  </div>;
}
