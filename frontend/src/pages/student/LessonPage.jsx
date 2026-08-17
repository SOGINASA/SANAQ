import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, CheckCircle2 } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { SpeechControls } from '../../features/accessibility';
import { contentApi } from '../../shared/api/contentApi';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLesson = async (lessonId) => {
    setLoading(true); setError('');
    try {
      const response = await contentApi.lesson(lessonId);
      setLesson(response.data.lesson);
      window.localStorage.setItem(progressKey, JSON.stringify({ lessonId, completed }));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await contentApi.module(moduleId);
        if (!active) return;
        const loadedModule = response.data.module;
        setModule(loadedModule);
        const savedId = initialProgress.lessonId;
        const target = loadedModule.lessons?.find((item) => item.id === savedId) || loadedModule.lessons?.[0];
        if (target) {
          const lessonResponse = await contentApi.lesson(target.id);
          if (active) setLesson(lessonResponse.data.lesson);
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

  const completeLesson = async () => {
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
          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">{lesson.tasks?.[0] && <Button variant="outline" onClick={() => navigate(`/student/task/${lesson.tasks[0].id}?module=${moduleId}`)}>{t('lesson.practice')} <ArrowRight className="h-5 w-5" /></Button>}<Button onClick={completeLesson} disabled={completed.includes(lesson.id) && lessonIndex === lessons.length - 1}>{completed.includes(lesson.id) ? t('lesson.completed') : lessonIndex < lessons.length - 1 ? t('lesson.nextLesson') : t('lesson.markComplete')} <CheckCircle2 className="h-5 w-5" /></Button></div>
        </Card>}
      </article>
      <aside><Card className="p-5"><p className="eyebrow">{t('lesson.contents')}</p>{lessons.map((item, index) => <button key={item.id} onClick={() => loadLesson(item.id)} className={`mt-3 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-sm font-bold ${lesson?.id === item.id ? 'bg-lavender-100 text-lavender-700' : 'hover:bg-stone-100'}`} aria-current={lesson?.id === item.id ? 'step' : undefined}><span className="relative shrink-0"><BookOpenText className="h-4 w-4" />{completed.includes(item.id) && <CheckCircle2 className="absolute -bottom-2 -right-2 h-3.5 w-3.5 rounded-full bg-paper text-mint-700" />}</span><span className="min-w-0 flex-1 break-words">{index + 1}. {item.title}</span></button>)}</Card></aside>
    </div>}
  </div>;
}
