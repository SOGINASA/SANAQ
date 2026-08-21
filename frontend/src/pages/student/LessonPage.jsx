import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, Circle, Play } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { SpeechControls } from '../../features/accessibility';
import { contentApi } from '../../shared/api/contentApi';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { useI18n } from '../../shared/i18n/i18n';

const readProgress = (key) => {
  try { return JSON.parse(window.localStorage.getItem(key)) || { lessonId: null, completed: [] }; }
  catch (_error) { return { lessonId: null, completed: [] }; }
};

export function LessonPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const progressKey = `sanaq:module-progress:${moduleId}`;
  const initialProgress = useMemo(() => readProgress(progressKey), [progressKey]);
  const [module, setModule] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [completed, setCompleted] = useState(initialProgress.completed || []);
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLesson = async (lessonId) => {
    setLoading(true); setError('');
    try {
      const [response, historyResponse] = await Promise.all([contentApi.lesson(lessonId), assessmentsApi.history()]);
      const loadedLesson = response.data.lesson;
      const taskIds = new Set((loadedLesson.tasks || []).map((item) => item.id));
      const finishedIds = [...new Set((historyResponse.data.items || []).filter((item) => item.status === 'completed').map((item) => item.task_id))];
      setCompletedTaskIds(finishedIds);
      if (taskIds.size > 0 && [...taskIds].every((id) => finishedIds.includes(id))) {
        setCompleted((items) => items.includes(lessonId) ? items : [...items, lessonId]);
      }
      setLesson(loadedLesson);
      window.localStorage.setItem(progressKey, JSON.stringify({ lessonId, completed }));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [response, historyResponse] = await Promise.all([contentApi.module(moduleId), assessmentsApi.history()]);
        if (!active) return;
        const loadedModule = response.data.module;
        setModule(loadedModule);
        const savedId = initialProgress.lessonId;
        const finishedIds = [...new Set((historyResponse.data.items || []).filter((item) => item.status === 'completed').map((item) => item.task_id))];
        setCompletedTaskIds(finishedIds);
        const target = loadedModule.lessons?.find((item) => item.id === savedId) || loadedModule.lessons?.[0];
        if (target) {
          const lessonResponse = await contentApi.lesson(target.id);
          if (active) {
            const loadedLesson = lessonResponse.data.lesson;
            const taskIds = (loadedLesson.tasks || []).map((item) => item.id);
            if (taskIds.length && taskIds.every((id) => finishedIds.includes(id))) {
              setCompleted((items) => items.includes(target.id) ? items : [...items, target.id]);
            }
            setLesson(loadedLesson);
          }
        }
      } catch (requestError) { if (active) setError(requestError.message); }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [initialProgress.lessonId, moduleId]);

  useEffect(() => {
    if (!lesson) return;
    window.localStorage.setItem(progressKey, JSON.stringify({ lessonId: lesson.id, completed }));
  }, [completed, lesson, progressKey]);

  const lessons = module?.lessons || [];
  const lessonIndex = lessons.findIndex((item) => item.id === lesson?.id);
  const moduleComplete = lessons.length > 0 && lessons.every((item) => completed.includes(item.id));
  const progress = lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0;
  const lessonTasks = lesson?.tasks || [];
  const completedLessonTasks = lessonTasks.filter((item) => completedTaskIds.includes(item.id)).length;
  const allLessonTasksComplete = !lessonTasks.length || completedLessonTasks === lessonTasks.length;

  const completeLesson = async () => {
    if (!allLessonTasksComplete) return;
    const nextCompleted = completed.includes(lesson.id) ? completed : [...completed, lesson.id];
    setCompleted(nextCompleted);
    const next = lessons[lessonIndex + 1];
    if (next) await loadLesson(next.id);
  };

  if (loading && !module) return <div className="mx-auto max-w-5xl py-16 text-center font-bold">{t('lesson.loading')}</div>;

  return <div className="mx-auto max-w-5xl animate-rise">
    <button onClick={() => navigate('/student/path')} className="mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> {t('lesson.back')}</button>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {module && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article className="min-w-0"><div className="mb-6"><p className="eyebrow">{module.title}</p><h1 className="page-title mt-3 break-words">{lesson?.title || t('lesson.fallbackTitle')}</h1><ProgressBar className="mt-5" value={progress} label={t('lesson.progress', { completed: completed.length, total: lessons.length })} /></div>
        {moduleComplete && <Card className="mb-5 border-mint-200 bg-mint-100 p-6 sm:p-8"><CheckCircle2 className="h-9 w-9 text-mint-700" /><h2 className="mt-4 text-2xl font-extrabold">{t('lesson.moduleComplete')}</h2><p className="mt-2 text-stone-600">{t('lesson.moduleCompleteDescription')}</p><Button className="mt-5" onClick={() => navigate('/student/path')}>{t('lesson.returnPath')} <ArrowRight className="h-5 w-5" /></Button></Card>}
        {lesson && <Card className="p-6 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-extrabold">{t('lesson.mainIdea')}</h2><SpeechControls text={[lesson.title, lesson.theory, lesson.example].filter(Boolean).join('. ')} label={t('lesson.read')} /></div><p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-stone-700">{lesson.theory}</p>{lesson.example && <div className="my-7 whitespace-pre-wrap rounded-3xl bg-ink p-7 text-center font-display text-2xl font-semibold text-white">{lesson.example}</div>}
          {lessonTasks.length > 0 && <section className="mt-9 rounded-3xl bg-stone-100 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-extrabold">{t('lesson.practiceTitle')}</h3><p className="mt-1 text-sm text-stone-500">{t('lesson.taskProgress', { completed: completedLessonTasks, total: lessonTasks.length })}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${allLessonTasksComplete ? 'bg-mint-100 text-mint-700' : 'bg-paper text-stone-600'}`}>{t(allLessonTasksComplete ? 'lesson.allReady' : 'lesson.completeAll')}</span></div><div className="mt-4 grid gap-2">{lessonTasks.map((taskItem, index) => { const done = completedTaskIds.includes(taskItem.id); return <button key={taskItem.id} type="button" onClick={() => navigate(`/student/task/${taskItem.id}?module=${moduleId}`)} className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition ${done ? 'border-mint-200 bg-mint-100' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${done ? 'bg-mint-700 text-white' : 'bg-lavender-100 text-lavender-700'}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : <Play className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><strong className="block">{t('lesson.taskNumber', { number: index + 1 })}</strong><span className="mt-0.5 block break-words text-sm text-stone-500">{taskItem.prompt}</span></span><span className="shrink-0 text-sm font-bold">{t(done ? 'lesson.ready' : 'lesson.start')}</span></button>; })}</div></section>}
          {!allLessonTasksComplete && <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"><Circle className="mt-0.5 h-4 w-4 shrink-0" /> {t('lesson.practiceRequired')}</p>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end"><Button onClick={completeLesson} disabled={!allLessonTasksComplete || (completed.includes(lesson.id) && lessonIndex === lessons.length - 1)}>{completed.includes(lesson.id) ? t('lesson.completed') : lessonIndex < lessons.length - 1 ? t('lesson.nextLesson') : t('lesson.markComplete')} <CheckCircle2 className="h-5 w-5" /></Button></div>
        </Card>}
      </article>
      <aside><Card className="p-5"><p className="eyebrow">{t('lesson.contents')}</p>{lessons.map((item, index) => <button key={item.id} onClick={() => loadLesson(item.id)} className={`mt-3 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-sm font-bold ${lesson?.id === item.id ? 'bg-lavender-100 text-lavender-700' : 'hover:bg-stone-100'}`} aria-current={lesson?.id === item.id ? 'step' : undefined}><span className="relative shrink-0"><BookOpenText className="h-4 w-4" />{completed.includes(item.id) && <CheckCircle2 className="absolute -bottom-2 -right-2 h-3.5 w-3.5 rounded-full bg-paper text-mint-700" />}</span><span className="min-w-0 flex-1 break-words">{index + 1}. {item.title}</span></button>)}</Card></aside>
    </div>}
  </div>;
}
