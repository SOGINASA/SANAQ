import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, Circle, Download, FileText, Lightbulb, ListChecks, Play } from 'lucide-react';
import { Button, Card, PageSkeleton, ProgressBar } from '../../shared/ui';
import { SpeechControls } from '../../features/accessibility';
import { contentApi } from '../../shared/api/contentApi';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { useI18n } from '../../shared/i18n/i18n';
import { saveBlobResponse } from '../../shared/lib/downloadFile';

const readProgress = (key) => {
  try { return JSON.parse(window.localStorage.getItem(key)) || { lessonId: null, completed: [] }; }
  catch (_error) { return { lessonId: null, completed: [] }; }
};

export function LessonPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const progressKey = `sanaq:module-progress:${moduleId}`;
  const initialProgress = useMemo(() => readProgress(progressKey), [progressKey]);
  const [module, setModule] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [completed, setCompleted] = useState(initialProgress.completed || []);
  const [completedTaskIds, setCompletedTaskIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [lessonFeedback, setLessonFeedback] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const loadLesson = async (lessonId) => {
    setLoading(true); setError('');
    setLessonFeedback('');
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

  const downloadWorkbook = async () => {
    if (!lesson) return;
    setDownloading(true); setError('');
    try {
      const response = await contentApi.lessonWorkbook(lesson.id);
      saveBlobResponse(response, `sanaq-${lesson.id}-workbook.pdf`);
    } catch (requestError) { setError(requestError.message); }
    finally { setDownloading(false); }
  };

  const practiceUrl = (taskId) => {
    const query = new URLSearchParams({ module: moduleId });
    if (searchParams.get('path')) query.set('path', searchParams.get('path'));
    return `/student/task/${taskId}?${query.toString()}`;
  };

  const submitFeedback = async (value) => {
    setFeedbackSaving(true); setError('');
    try {
      await contentApi.lessonFeedback(lesson.id, { value });
      setLessonFeedback(value);
    } catch (requestError) { setError(requestError.message); }
    finally { setFeedbackSaving(false); }
  };

  if (loading && !module) return <PageSkeleton cards={3} label={t('lesson.loading')} />;

  return <div className="mx-auto max-w-5xl animate-rise">
    <button onClick={() => navigate(searchParams.get('path') ? `/student/path?path=${searchParams.get('path')}` : '/student/path')} className="mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> {t('lesson.back')}</button>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {module && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article className="min-w-0">
        <div className="mb-6">
          <p className="eyebrow">{module.title}</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><h1 className="page-title break-words">{lesson?.title || t('lesson.fallbackTitle')}</h1><p className="mt-2 text-sm text-stone-500">{t('lesson.fullLessonMeta', { minutes: lesson?.guide?.estimated_minutes || 45, pages: lesson?.guide?.workbook?.pages || 5 })}</p></div>
            <Button className="w-full sm:w-auto" variant="outline" loading={downloading} onClick={downloadWorkbook}><Download className="h-5 w-5" /> {t('lesson.downloadWorkbook')}</Button>
          </div>
          <ProgressBar className="mt-5" value={progress} label={t('lesson.progress', { completed: completed.length, total: lessons.length })} />
        </div>
        {moduleComplete && <Card className="mb-5 border-mint-200 bg-mint-100 p-6 sm:p-8"><CheckCircle2 className="h-9 w-9 text-mint-700" /><h2 className="mt-4 text-2xl font-extrabold">{t('lesson.moduleComplete')}</h2><p className="mt-2 text-stone-600">{t('lesson.moduleCompleteDescription')}</p><Button className="mt-5" onClick={() => navigate(searchParams.get('path') ? `/student/path?path=${searchParams.get('path')}` : '/student/path')}>{t('lesson.returnPath')} <ArrowRight className="h-5 w-5" /></Button></Card>}
        {lesson && <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-ink p-6 text-white sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">{t('lesson.lessonGoal')}</p><h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t('lesson.whatYouLearn')}</h2><p className="mt-3 leading-7 text-stone-300">{lesson.guide?.intro || lesson.theory}</p></div><SpeechControls text={[lesson.title, lesson.guide?.intro, ...(lesson.guide?.objectives || []), lesson.theory].filter(Boolean).join('. ')} label={t('lesson.read')} /></div></div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">{(lesson.guide?.objectives || []).map((objective, index) => <div key={objective} className="flex items-start gap-3 rounded-2xl bg-lavender-50 p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lavender-600 text-sm font-extrabold text-white">{index + 1}</span><p className="text-sm font-bold leading-6 text-stone-700">{objective}</p></div>)}</div>
          </Card>

          {(lesson.guide?.sections || []).map((section) => <Card key={section.title} className="p-5 sm:p-8"><div className="flex items-start gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${section.kind === 'warning' ? 'bg-warning-100 text-warning-700' : section.kind === 'formula' ? 'bg-mint-100 text-mint-700' : 'bg-lavender-100 text-lavender-700'}`}>{section.kind === 'warning' ? <AlertTriangle className="h-5 w-5" /> : section.kind === 'formula' ? <ListChecks className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><h2 className="text-xl font-extrabold sm:text-2xl">{section.title}</h2>{section.body && <p className={`mt-4 whitespace-pre-wrap leading-8 ${section.kind === 'formula' ? 'rounded-2xl bg-ink p-5 text-center font-display text-lg font-semibold text-white sm:text-xl' : 'text-stone-700'}`}>{section.body}</p>}{section.callout && <p className="mt-4 rounded-2xl border border-lavender-200 bg-lavender-50 p-4 text-sm font-semibold leading-6 text-lavender-800">{section.callout}</p>}{section.items?.length > 0 && <ol className="mt-5 grid gap-3">{section.items.map((item, index) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-stone-600"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-xs font-extrabold text-stone-700">{index + 1}</span><span>{item}</span></li>)}</ol>}</div></div></Card>)}

          {lesson.guide?.examples?.length > 0 && <section aria-labelledby="worked-examples"><div className="mb-4 flex items-center gap-3"><FileText className="h-6 w-6 text-lavender-600" /><h2 id="worked-examples" className="text-2xl font-extrabold">{t('lesson.workedExamples')}</h2></div><div className="grid gap-4">{lesson.guide.examples.map((example) => <Card key={example.title} className="overflow-hidden"><div className="border-b border-stone-200 bg-stone-50 px-5 py-4 sm:px-7"><p className="text-xs font-bold uppercase tracking-wider text-lavender-700">{example.title}</p><p className="mt-2 break-words text-lg font-extrabold">{example.problem}</p></div><ol className="grid gap-3 p-5 sm:p-7">{example.steps.map((step, index) => <li key={`${example.title}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-stone-600"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mint-100 text-xs font-extrabold text-mint-700">{index + 1}</span><span>{step}</span></li>)}</ol></Card>)}</div></section>}

          {lessonTasks.length > 0 && <section className="rounded-3xl bg-stone-100 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-extrabold">{t('lesson.practiceTitle')}</h2><p className="mt-1 text-sm text-stone-500">{t('lesson.taskProgress', { completed: completedLessonTasks, total: lessonTasks.length })}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${allLessonTasksComplete ? 'bg-mint-100 text-mint-700' : 'bg-paper text-stone-600'}`}>{t(allLessonTasksComplete ? 'lesson.allReady' : 'lesson.completeAll')}</span></div><div className="mt-5 grid gap-3">{lessonTasks.map((taskItem, index) => { const done = completedTaskIds.includes(taskItem.id); return <button key={taskItem.id} type="button" onClick={() => navigate(practiceUrl(taskItem.id))} className={`flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition sm:p-4 ${done ? 'border-mint-200 bg-mint-100' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${done ? 'bg-mint-700 text-white' : 'bg-lavender-100 text-lavender-700'}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : <Play className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><strong className="block">{t('lesson.taskNumber', { number: index + 1 })}</strong><span className="mt-0.5 block break-words text-sm leading-5 text-stone-500">{taskItem.prompt}</span></span><span className="hidden shrink-0 text-sm font-bold sm:block">{t(done ? 'lesson.ready' : 'lesson.start')}</span></button>; })}</div></section>}
          {!allLessonTasksComplete && <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"><Circle className="mt-0.5 h-4 w-4 shrink-0" /> {t('lesson.practiceRequired')}</p>}
          <Card className="p-5 sm:p-6"><h2 className="text-lg font-extrabold">{t('lesson.feedbackTitle')}</h2><p className="mt-1 text-sm text-stone-500">{t('lesson.feedbackDescription')}</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{['clear', 'too_hard', 'need_example', 'too_easy'].map((value) => <button key={value} type="button" disabled={feedbackSaving} onClick={() => submitFeedback(value)} className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${lessonFeedback === value ? 'border-mint-500 bg-mint-100 text-mint-700' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}>{t(`lesson.feedback.${value}`)}</button>)}</div>{lessonFeedback && <p className="mt-3 flex items-center gap-2 text-sm font-bold text-mint-700"><CheckCircle2 className="h-4 w-4" />{t('lesson.feedbackSaved')}</p>}</Card>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end"><Button onClick={completeLesson} disabled={!allLessonTasksComplete || (completed.includes(lesson.id) && lessonIndex === lessons.length - 1)}>{completed.includes(lesson.id) ? t('lesson.completed') : lessonIndex < lessons.length - 1 ? t('lesson.nextLesson') : t('lesson.markComplete')} <CheckCircle2 className="h-5 w-5" /></Button></div>
        </div>}
      </article>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start"><Card className="p-5"><p className="eyebrow">{t('lesson.contents')}</p>{lessons.map((item, index) => <button key={item.id} onClick={() => loadLesson(item.id)} className={`mt-3 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left text-sm font-bold ${lesson?.id === item.id ? 'bg-lavender-100 text-lavender-700' : 'hover:bg-stone-100'}`} aria-current={lesson?.id === item.id ? 'step' : undefined}><span className="relative shrink-0"><BookOpenText className="h-4 w-4" />{completed.includes(item.id) && <CheckCircle2 className="absolute -bottom-2 -right-2 h-3.5 w-3.5 rounded-full bg-paper text-mint-700" />}</span><span className="min-w-0 flex-1 break-words">{index + 1}. {item.title}</span></button>)}</Card><Card className="border-lavender-200 bg-lavender-50 p-5"><FileText className="h-6 w-6 text-lavender-700" /><h2 className="mt-4 font-extrabold">{t('lesson.workbookTitle')}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{t('lesson.workbookDescription')}</p><Button className="mt-4 w-full" size="sm" loading={downloading} onClick={downloadWorkbook}><Download className="h-4 w-4" /> {t('lesson.downloadPdf')}</Button></Card></aside>
    </div>}
  </div>;
}
