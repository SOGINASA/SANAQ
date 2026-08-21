import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { Button, Card, PageSkeleton, ProgressBar } from '../../shared/ui';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { aiTutorApi } from '../../features/ai-tutor/aiTutorApi';
import { reviewsApi } from '../../features/spaced-repetition/reviewsApi';
import { DifficultyAdaptation } from '../../features/assessments';
import { SpeechControls } from '../../features/accessibility';
import { useI18n } from '../../shared/i18n/i18n';

export function TaskPage() {
  const { t } = useI18n();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState('');
  const [mode, setMode] = useState('short');
  const [explanation, setExplanation] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    assessmentsApi.task(taskId)
      .then((response) => { const loaded = response.data.task; setTask(loaded); setAnswer(loaded.task_type === 'multiple_choice' ? [] : loaded.task_type === 'matching' ? {} : loaded.task_type === 'ordering' ? [...(loaded.options || [])] : ''); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const start = async () => {
    setLoading(true); setError('');
    try { const response = await assessmentsApi.startAttempt(task.id); setAttempt(response.data.attempt); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const check = async () => {
    setLoading(true); setError('');
    try { const submitted = task.task_type === 'multiple_choice' ? JSON.stringify([...answer].sort()) : ['matching', 'ordering'].includes(task.task_type) ? JSON.stringify(answer) : answer; const response = await assessmentsApi.answer(attempt.id, submitted); setFeedback(response.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const requestHint = async () => {
    setLoading(true); setError('');
    try { const response = await aiTutorApi.hint(task.id); setHint(response.data.hint); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const explain = async () => {
    setLoading(true); setError('');
    try { const response = await aiTutorApi.explanation({ attempt_id: attempt.id, task_id: task.id, mode }); setExplanation(response.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const complete = async () => {
    setLoading(true); setError('');
    try {
      const response = await assessmentsApi.complete(attempt.id);
      const reviewId = searchParams.get('review');
      if (reviewId) await reviewsApi.complete(reviewId);
      setResult(response.data.result);
    }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  if (loading && !task) return <PageSkeleton className="max-w-4xl" layout="form" label={t('practice.loading')} />;

  const moduleId = searchParams.get('module');
  return <div className="mx-auto max-w-4xl animate-rise"><button onClick={() => navigate(moduleId ? `/student/learn/${moduleId}` : '/student/path')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> {moduleId ? t('practice.backToLesson') : t('practice.back')}</button><div className="mb-6"><p className="eyebrow">{t('practice.eyebrow', { skill: task?.skill_name || '' })}</p><h1 className="mt-2 text-3xl font-extrabold">{t('practice.title')}</h1><ProgressBar className="mt-5" value={result ? 100 : feedback ? 75 : attempt ? 35 : 10} /></div>
    {error && <div className="state-error mb-5" role="alert">{error}</div>}
    {task && <div className="mb-5 grid gap-4"><DifficultyAdaptation current={task.difficulty} adaptation={result?.adaptation || feedback?.adaptation} /><SpeechControls text={[task.prompt, ...(task.options || []), feedback?.feedback, explanation?.content?.explanation || explanation?.content].filter((item) => typeof item === 'string').join('. ')} label={t('practice.readTask')} /></div>}
    {task && <Card className="p-6 sm:p-10"><p className="text-sm font-bold text-lavender-600">{t('practice.difficulty', { level: task.difficulty })}</p><h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">{task.prompt}</h2>
      {!attempt && <Button className="mt-8" loading={loading} onClick={start}>{t('practice.start')}</Button>}
      {attempt && !feedback && <><TaskAnswerInput task={task} answer={answer} setAnswer={setAnswer} t={t} /><div className="mt-8 flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" loading={loading} onClick={requestHint}><Lightbulb className="h-5 w-5" /> {t('practice.hint')}</Button><Button disabled={!answerIsReady(task, answer)} loading={loading} onClick={check}>{t('practice.check')}</Button></div>{hint && <div className="mt-4 rounded-2xl bg-lime/25 p-5 text-sm font-semibold">{hint}</div>}</>}
      {feedback && !result && <div className={`mt-8 rounded-3xl p-6 ${feedback.is_correct ? 'bg-mint-100' : 'bg-danger-100'}`}><div className="flex items-center gap-3">{feedback.is_correct ? <CheckCircle2 className="h-6 w-6 text-mint-700" /> : <XCircle className="h-6 w-6 text-danger-700" />}<p className="text-lg font-extrabold">{feedback.feedback}</p></div>{feedback.hint && <p className="mt-3">{t('practice.hint')}: {feedback.hint}</p>}<div className="mt-5 flex flex-wrap gap-2">{[['short', t('practice.short')], ['steps', t('practice.steps')], ['real_life', t('practice.realLife')]].map(([value, label]) => <button key={value} onClick={() => setMode(value)} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${mode === value ? 'bg-ink text-white' : 'bg-paper'}`}>{label}</button>)}<Button variant="outline" onClick={explain} loading={loading}>{t('practice.explain')}</Button></div>{explanation && <div className="mt-4 rounded-2xl bg-paper p-5 text-stone-700">{typeof explanation.content === 'string' ? explanation.content : <><strong>{explanation.content?.title}</strong>{explanation.content?.steps?.map((step) => <p className="mt-2" key={step}>{step}</p>)}{explanation.content?.example && <p className="mt-2">{explanation.content.example}</p>}{explanation.content?.explanation && <p className="mt-2">{explanation.content.explanation}</p>}</>}</div>}<div className="mt-6 flex justify-end"><Button loading={loading} onClick={complete}>{t('practice.complete')}</Button></div></div>}
      {result && <div className="mt-8 rounded-3xl bg-mint-100 p-6"><p className="text-xl font-extrabold">{t('practice.saved')}</p><p className="mt-2">{t('practice.mastery', { mastery: Math.round((result.skill?.mastery || 0) * 100), change: Math.round((result.mastery_change || 0) * 100) })}</p><Button className="mt-6" onClick={() => navigate(searchParams.get('module') ? `/student/learn/${searchParams.get('module')}` : searchParams.get('path') ? `/student/path?path=${searchParams.get('path')}` : '/student/knowledge-map')}>{t('practice.updatePath')} <ArrowRight className="h-5 w-5" /></Button></div>}
    </Card>}
  </div>;
}

function answerIsReady(task, answer) {
  if (task.task_type === 'matching') return (task.options?.left || []).every((item) => answer?.[item]);
  if (Array.isArray(answer)) return answer.length > 0;
  return Boolean(answer);
}

function TaskAnswerInput({ task, answer, setAnswer, t }) {
  if (task.task_type === 'matching') {
    const left = task.options?.left || [];
    const right = task.options?.right || [];
    return <fieldset className="mt-8"><legend className="mb-3 text-sm font-bold text-stone-600">{t('taskTypes.matchHint')}</legend><div className="space-y-3">{left.map((item) => <label key={item} className="grid gap-2 rounded-2xl bg-stone-100 p-3 sm:grid-cols-2 sm:items-center"><span className="break-words font-bold">{item}</span><select className="field-control" value={answer[item] || ''} onChange={(event) => setAnswer((current) => ({ ...current, [item]: event.target.value }))}><option value="">—</option>{right.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label>)}</div></fieldset>;
  }
  if (task.task_type === 'ordering') {
    const move = (index, offset) => { const next = [...answer]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; setAnswer(next); };
    return <fieldset className="mt-8"><legend className="mb-3 text-sm font-bold text-stone-600">{t('taskTypes.orderHint')}</legend><div className="space-y-2">{answer.map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-2xl bg-stone-100 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper font-bold">{index + 1}</span><span className="min-w-0 flex-1 break-words font-bold">{item}</span><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper disabled:opacity-30" aria-label={t('taskTypes.moveUp')}><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index === answer.length - 1} onClick={() => move(index, 1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper disabled:opacity-30" aria-label={t('taskTypes.moveDown')}><ArrowDown className="h-4 w-4" /></button></div>)}</div></fieldset>;
  }
  if (!task.options?.length) return <input type={task.task_type === 'numeric' ? 'number' : 'text'} step="any" className="field-control mt-8" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t('practice.answerPlaceholder')} />;
  const multiple = task.task_type === 'multiple_choice';
  const selected = multiple && Array.isArray(answer) ? answer : [];
  return <fieldset className="mt-8"><legend className="mb-3 text-sm font-bold text-stone-600">{multiple ? t('taskTypes.selectSeveral') : t('diagnostic.choose')}</legend><div className="grid gap-3 sm:grid-cols-2">{task.options.map((option, index) => {
    const checked = multiple ? selected.includes(option) : answer === option;
    return <label key={option} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 font-bold ${checked ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200'}`}><input type={multiple ? 'checkbox' : 'radio'} className="sr-only" checked={checked} onChange={() => setAnswer(multiple ? checked ? selected.filter((item) => item !== option) : [...selected, option] : option)} /><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-paper text-sm">{checked && multiple ? <CheckCircle2 className="h-5 w-5 text-lavender-600" /> : String.fromCharCode(65 + index)}</span><span className="break-words">{option}</span></label>;
  })}</div></fieldset>;
}
