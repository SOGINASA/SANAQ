import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, LockKeyhole, SlidersHorizontal, Sparkles, Target } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';
import { learningPathApi } from '../../features/learning-path/learningPathApi';

const paceOptions = [
  ['light', 'Лёгкий', '10–15 минут'], ['balanced', 'Сбалансированный', '20 минут'], ['intensive', 'Интенсивный', '30–40 минут'],
];

const minutesByPace = { light: 15, balanced: 20, intensive: 40 };

export function LearningPathPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      if (!pathId) throw new Error('Сначала завершите диагностику, чтобы backend создал маршрут');
      const [pathResponse, stepResponse] = await Promise.all([
        learningPathApi.get(pathId), learningPathApi.nextStep(pathId),
      ]);
      setPath(pathResponse.data.learning_path);
      setPace(pathResponse.data.learning_path.pace);
      setNextStep(stepResponse.data.step);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => { loadPath(); }, [loadPath]);

  const saveSettings = async () => {
    setLoading(true);
    try {
      await learningPathApi.update(path.id, { pace });
      const recalculated = await learningPathApi.recalculate(path.id);
      await learningPathApi.previewStudyPlan({
        subject_id: recalculated.data.learning_path.subject_id || 'mathematics',
        weekday_minutes: minutesByPace[pace],
        weekend_minutes: Math.min(minutesByPace[pace] + 15, 60),
        max_skills: 20,
      });
      setPath(recalculated.data.learning_path);
      setSettingsOpen(false);
      setStatus('Темп сохранён, календарный план пересчитан');
      await loadPath();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !path) return <div className="mx-auto max-w-6xl py-16 text-center font-bold">Загружаем маршрут из backend…</div>;

  return <div className="mx-auto max-w-6xl animate-rise">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Персональный маршрут</p><h1 className="page-title mt-3">{path?.title || 'Маршрут пока не создан'}</h1><p className="mt-3 text-stone-600">Порядок шагов рассчитан по диагностике и зависимостям навыков.</p></div>{path && <Button variant="outline" onClick={() => setSettingsOpen(true)}><SlidersHorizontal className="h-5 w-5" /> Настроить план</Button>}</div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}<div className="mt-3"><Button size="sm" onClick={() => navigate('/student/onboarding')}>Начать настройку</Button></div></div>}
    {path && <>
      <Card className="mt-7 overflow-hidden"><div className="grid gap-6 bg-ink p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-lime"><Sparkles className="h-4 w-4" /> Следующий шаг от backend</div><h2 className="mt-3 text-2xl font-extrabold">{nextStep?.skill_name || 'Маршрут на сегодня завершён'}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">{nextStep?.reason || 'Все доступные шаги выполнены. Прогресс сохранён.'}</p></div>{nextStep && <Button size="lg" onClick={() => navigate(`/student/task/${nextStep.task_id}?path=${path.id}`)}>Начать задание <ArrowRight className="h-5 w-5" /></Button>}</div><div className="p-6 sm:p-8"><ProgressBar value={Math.round((path.progress || 0) * 100)} label="Пройдено по маршруту" /></div></Card>
      <div className="mt-7 grid gap-4">{path.steps?.map((step) => { const done = step.status === 'completed'; const available = step.status === 'available'; return <Card key={step.id} className={`p-5 ${available ? 'border-lavender-300 bg-lavender-50' : ''}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? 'bg-mint-100 text-mint-700' : available ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-400'}`}>{done ? <Check className="h-5 w-5" /> : available ? <Target className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span><div className="flex-1"><p className="text-xs font-extrabold uppercase tracking-wider text-stone-400">Шаг {step.order}</p><h2 className="mt-1 text-lg font-extrabold">{step.skill_name}</h2><p className="mt-1 text-sm text-stone-500">{step.reason}</p></div>{available && <Button variant="outline" onClick={() => navigate(`/student/task/${step.task_id}?path=${path.id}`)}>Открыть</Button>}</div></Card>; })}</div>
    </>}
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Настроить план" description="Темп сохранится на сервере, затем маршрут будет пересчитан." footer={<><Button variant="ghost" onClick={() => setSettingsOpen(false)}>Отмена</Button><Button loading={loading} onClick={saveSettings}>Сохранить</Button></>}><div className="grid gap-3">{paceOptions.map(([value, label, duration]) => <label key={value} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 ${pace === value ? 'border-lavender-500 bg-lavender-50' : 'border-stone-200'}`}><input type="radio" name="pace" checked={pace === value} onChange={() => setPace(value)} /><span><strong>{label}</strong><span className="ml-2 text-sm text-stone-500">{duration}</span></span></label>)}</div></Dialog>
    <StatusToast message={status} onClose={() => setStatus('')} />
  </div>;
}
