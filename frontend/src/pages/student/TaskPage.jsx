import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { aiTutorApi } from '../../features/ai-tutor/aiTutorApi';
import { reviewsApi } from '../../features/spaced-repetition/reviewsApi';

export function TaskPage() {
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
      .then((response) => setTask(response.data.task))
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
    try { const response = await assessmentsApi.answer(attempt.id, answer); setFeedback(response.data); }
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

  if (loading && !task) return <div className="mx-auto max-w-4xl py-16 text-center font-bold">Загружаем задание…</div>;

  return <div className="mx-auto max-w-4xl animate-rise"><button onClick={() => navigate('/student/path')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> К маршруту</button><div className="mb-6"><p className="eyebrow">Практика · {task?.skill_name}</p><h1 className="mt-2 text-3xl font-extrabold">Задание от backend</h1><ProgressBar className="mt-5" value={result ? 100 : feedback ? 75 : attempt ? 35 : 10} /></div>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {task && <Card className="p-6 sm:p-10"><p className="text-sm font-bold text-lavender-600">Сложность {task.difficulty}</p><h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">{task.prompt}</h2>
      {!attempt && <Button className="mt-8" loading={loading} onClick={start}>Начать попытку</Button>}
      {attempt && !feedback && <><div className="mt-8">{task.options?.length ? <div className="grid gap-3 sm:grid-cols-2">{task.options.map((option, index) => <label key={option} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 font-bold ${answer === option ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200'}`}><input type="radio" className="sr-only" checked={answer === option} onChange={() => setAnswer(option)} /><span className="grid h-8 w-8 place-items-center rounded-xl bg-paper text-sm">{String.fromCharCode(65 + index)}</span>{option}</label>)}</div> : <input className="field-control" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Введите ответ" />}</div><div className="mt-8 flex items-center justify-between gap-3"><Button variant="ghost" loading={loading} onClick={requestHint}><Lightbulb className="h-5 w-5" /> Подсказка</Button><Button disabled={!answer} loading={loading} onClick={check}>Проверить</Button></div>{hint && <div className="mt-4 rounded-2xl bg-lime/25 p-5 text-sm font-semibold">{hint}</div>}</>}
      {feedback && !result && <div className={`mt-8 rounded-3xl p-6 ${feedback.is_correct ? 'bg-mint-100' : 'bg-[#FFE8E2]'}`}><div className="flex items-center gap-3">{feedback.is_correct ? <CheckCircle2 className="h-6 w-6 text-mint-700" /> : <XCircle className="h-6 w-6 text-[#A74735]" />}<p className="text-lg font-extrabold">{feedback.feedback}</p></div>{feedback.hint && <p className="mt-3">Подсказка: {feedback.hint}</p>}<div className="mt-5 flex flex-wrap gap-2">{[['short', 'Коротко'], ['steps', 'Пошагово'], ['real_life', 'На примере']].map(([value, label]) => <button key={value} onClick={() => setMode(value)} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${mode === value ? 'bg-ink text-white' : 'bg-paper'}`}>{label}</button>)}<Button variant="outline" onClick={explain} loading={loading}>Объяснить</Button></div>{explanation && <div className="mt-4 rounded-2xl bg-paper p-5 text-stone-700">{typeof explanation.content === 'string' ? explanation.content : <><strong>{explanation.content?.title}</strong>{explanation.content?.steps?.map((step) => <p className="mt-2" key={step}>{step}</p>)}{explanation.content?.example && <p className="mt-2">{explanation.content.example}</p>}{explanation.content?.explanation && <p className="mt-2">{explanation.content.explanation}</p>}</>}</div>}<div className="mt-6 flex justify-end"><Button loading={loading} onClick={complete}>Завершить попытку</Button></div></div>}
      {result && <div className="mt-8 rounded-3xl bg-mint-100 p-6"><p className="text-xl font-extrabold">Прогресс сохранён</p><p className="mt-2">Mastery навыка: {Math.round((result.skill?.mastery || 0) * 100)}%. Изменение: {Math.round((result.mastery_change || 0) * 100)} п.п.</p><Button className="mt-6" onClick={() => navigate(searchParams.get('path') ? `/student/path?path=${searchParams.get('path')}` : '/student/knowledge-map')}>Обновить маршрут <ArrowRight className="h-5 w-5" /></Button></div>}
    </Card>}
  </div>;
}
