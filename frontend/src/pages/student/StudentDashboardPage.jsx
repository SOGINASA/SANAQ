import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LogOut, Sparkles } from 'lucide-react';
import { DataSourceBadge } from '../../components/feedback/DataSourceBadge';
import { aiTutorApi } from '../../features/ai-tutor/aiTutorApi';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { useAuthStore } from '../../features/auth/authStore';
import { diagnosticsApi } from '../../features/diagnostics/diagnosticsApi';
import { knowledgeMapApi } from '../../features/knowledge-map/knowledgeMapApi';
import { learningPathApi } from '../../features/learning-path/learningPathApi';
import { progressApi } from '../../features/progress/progressApi';
import { catalogApi } from '../../shared/api/catalogApi';
import { Button, Card, ProgressBar } from '../../shared/ui';

const DEFAULT_SELECTION = { grade: 9, subject_id: 'mathematics', goal_id: 'exam' };

function ChoiceList({ options = [], value, onChange }) {
  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`min-h-12 rounded-2xl border-2 px-4 text-left font-semibold transition ${value === option ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [sourceMeta, setSourceMeta] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [diagnostic, setDiagnostic] = useState(null);
  const [question, setQuestion] = useState(null);
  const [diagnosticAnswer, setDiagnosticAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [path, setPath] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [task, setTask] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [taskAnswer, setTaskAnswer] = useState('');
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [explanationMode, setExplanationMode] = useState('short');
  const [explanation, setExplanation] = useState(null);
  const [progress, setProgress] = useState(null);
  const [knowledgeMap, setKnowledgeMap] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (operation) => {
    setBusy(true);
    setError('');
    try {
      return await operation();
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshProgress = useCallback(async () => {
    const [summary, map] = await Promise.all([
      progressApi.summary(selection.subject_id),
      knowledgeMapApi.get(selection.subject_id),
    ]);
    setProgress(summary.data);
    setKnowledgeMap(map.data);
  }, [selection.subject_id]);

  const loadPath = useCallback(async (pathId) => {
    const [pathResponse, stepResponse] = await Promise.all([
      learningPathApi.get(pathId),
      learningPathApi.nextStep(pathId),
    ]);
    setPath(pathResponse.data.learning_path);
    const step = stepResponse.data.step;
    setNextStep(step);
    setAttempt(null);
    setAnswerFeedback(null);
    setExplanation(null);
    if (step?.task_id) {
      const taskResponse = await assessmentsApi.task(step.task_id);
      setTask(taskResponse.data.task);
    } else {
      setTask(null);
    }
    await refreshProgress();
  }, [refreshProgress]);

  const loadQuestion = useCallback(async (diagnosticId) => {
    const response = await diagnosticsApi.nextQuestion(diagnosticId);
    setQuestion(response.data.question);
    setDiagnostic(response.data.diagnostic);
    if (!response.data.question && response.data.complete_ready) {
      const completed = await diagnosticsApi.complete(diagnosticId);
      setResult(completed.data.result);
      await loadPath(completed.data.learning_path_id);
    }
  }, [loadPath]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const [metaResponse, profileResponse, historyResponse] = await Promise.all([
          catalogApi.meta(),
          catalogApi.studentProfile(),
          diagnosticsApi.history(),
        ]);
        if (!active) return;
        setSourceMeta({ ...metaResponse.meta, dataMode: metaResponse.data.data_mode });
        setProfile(profileResponse.data.profile);
        const latest = historyResponse.data.items?.[0];
        if (latest?.status === 'in_progress') {
          setDiagnostic(latest);
          await loadQuestion(latest.id);
        } else if (latest?.status === 'completed') {
          setDiagnostic(latest);
          const resultResponse = await diagnosticsApi.result(latest.id);
          if (!active) return;
          setResult(resultResponse.data.result);
          await loadPath(resultResponse.data.learning_path_id);
        } else {
          await refreshProgress();
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    bootstrap();
    return () => { active = false; };
  }, [loadPath, loadQuestion, refreshProgress]);

  const saveProfile = () => run(async () => {
    const response = await catalogApi.saveStudentProfile({
      grade: Number(selection.grade),
      subject_ids: [selection.subject_id],
      goal_ids: [selection.goal_id],
      level: 'diagnostic_pending',
    });
    setProfile(response.data.profile);
  });

  const startDiagnostic = () => run(async () => {
    const response = await diagnosticsApi.create(selection);
    setDiagnostic(response.data.diagnostic);
    setResult(null);
    setPath(null);
    await loadQuestion(response.data.diagnostic.id);
  });

  const submitDiagnostic = () => run(async () => {
    await diagnosticsApi.answer(diagnostic.id, {
      question_id: question.id,
      answer: diagnosticAnswer,
      time_spent_seconds: 20,
      attempt_number: 1,
    });
    setDiagnosticAnswer('');
    await loadQuestion(diagnostic.id);
  });

  const startAttempt = () => run(async () => {
    const response = await assessmentsApi.startAttempt(task.id);
    setAttempt(response.data.attempt);
  });

  const submitTask = () => run(async () => {
    const response = await assessmentsApi.answer(attempt.id, taskAnswer);
    setAnswerFeedback(response.data);
  });

  const requestExplanation = () => run(async () => {
    const response = await aiTutorApi.explanation({ attempt_id: attempt.id, task_id: task.id, mode: explanationMode });
    setExplanation(response.data);
  });

  const completeAttempt = () => run(async () => {
    await assessmentsApi.complete(attempt.id);
    setTaskAnswer('');
    await loadPath(path.id);
  });

  const stage = useMemo(() => {
    if (!profile) return 1;
    if (!result) return 2;
    if (task) return 3;
    return 4;
  }, [profile, result, task]);

  const mastery = Math.round((progress?.overall_mastery || 0) * 100);

  return (
    <div className="mx-auto max-w-7xl animate-rise">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Математика · 9 класс</p>
          <h1 className="page-title mt-3">{user?.name ? `${user.name}, твой следующий шаг` : 'Твой следующий понятный шаг'}</h1>
          <p className="mt-3 max-w-2xl text-stone-600">Диагностика, маршрут и прогресс загружаются из backend и меняются после каждого сохранённого ответа.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DataSourceBadge meta={sourceMeta} />
          <Button variant="ghost" size="sm" onClick={async () => { try { await logout(); } finally { navigate('/login'); } }}><LogOut className="h-4 w-4" /> Выйти</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Этап обучения">
        {['Профиль', 'Диагностика', 'Маршрут', 'Прогресс'].map((label, index) => (
          <span key={label} className={`rounded-full px-3 py-2 text-xs font-extrabold ${stage >= index + 1 ? 'bg-lavender-100 text-lavender-700' : 'bg-stone-200 text-stone-500'}`}>{index + 1}. {label}</span>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          <strong>Backend не вернул данные.</strong> {error}
          <span className="mt-1 block text-sm">Fallback/mock-данные не подставлялись.</span>
        </div>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="grid content-start gap-6">
          {!profile && (
            <Card className="p-6 sm:p-8">
              <p className="eyebrow">Шаг 1</p><h2 className="mt-2 text-2xl font-extrabold">Настроим учебную цель</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="field-label">Класс<select className="field-control mt-2" value={selection.grade} onChange={(event) => setSelection({ ...selection, grade: event.target.value })}><option value="9">9 класс</option></select></label>
                <label className="field-label">Предмет<select className="field-control mt-2" value={selection.subject_id} onChange={(event) => setSelection({ ...selection, subject_id: event.target.value })}><option value="mathematics">Математика</option></select></label>
                <label className="field-label">Цель<select className="field-control mt-2" value={selection.goal_id} onChange={(event) => setSelection({ ...selection, goal_id: event.target.value })}><option value="exam">Подготовка к экзамену</option><option value="review">Повторение</option></select></label>
              </div>
              <Button className="mt-6" onClick={saveProfile} loading={busy}>Сохранить профиль <ArrowRight className="h-4 w-4" /></Button>
            </Card>
          )}

          {profile && !diagnostic && (
            <Card className="p-7 sm:p-10">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Sparkles className="h-6 w-6" /></span>
              <p className="eyebrow mt-6">SANA готова</p><h2 className="mt-2 text-3xl font-extrabold">Найдём точку максимального прогресса</h2>
              <p className="mt-3 text-stone-600">Короткая диагностика. Правильные ответы не раскрываются до завершения.</p>
              <Button className="mt-6" onClick={startDiagnostic} loading={busy}>Начать диагностику</Button>
            </Card>
          )}

          {diagnostic && !result && question && (
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Диагностика</p><h2 className="mt-2 text-2xl font-extrabold">{question.prompt}</h2></div><span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-bold">Уровень {question.difficulty}</span></div>
              <ProgressBar className="my-6" value={Math.round((diagnostic.progress || 0) * 100)} label="Пройдено" />
              {question.options?.length ? <ChoiceList options={question.options} value={diagnosticAnswer} onChange={setDiagnosticAnswer} /> : <input className="field-control" value={diagnosticAnswer} onChange={(event) => setDiagnosticAnswer(event.target.value)} placeholder="Введите ответ" />}
              <Button className="mt-6" disabled={!diagnosticAnswer} loading={busy} onClick={submitDiagnostic}>Ответить</Button>
            </Card>
          )}

          {result && (
            <Card className="border-mint-300 bg-mint-50 p-6 sm:p-8">
              <p className="eyebrow text-mint-700">Результат диагностики</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-extrabold">{Math.round(result.score * 100)}% · уровень {result.level}</h2><p className="mt-2 max-w-2xl text-stone-600">{result.explanation}</p></div><div className="flex gap-2"><span className="rounded-2xl bg-paper px-4 py-3 text-sm"><strong className="block text-xl">{result.strengths?.length || 0}</strong>сильных</span><span className="rounded-2xl bg-paper px-4 py-3 text-sm"><strong className="block text-xl">{result.gaps?.length || 0}</strong>пробелов</span></div></div>
            </Card>
          )}

          {task && (
            <Card className="p-6 sm:p-8">
              <p className="eyebrow">Шаг маршрута · {nextStep?.skill_name}</p><h2 className="mt-2 text-2xl font-extrabold">{task.prompt}</h2>
              <div className="mt-5 rounded-2xl border-l-4 border-lavender-500 bg-lavender-50 p-4 text-sm text-stone-700"><strong>Почему этот шаг:</strong> {nextStep?.reason}</div>
              {!attempt ? <Button className="mt-6" onClick={startAttempt} loading={busy}>Начать задание</Button> : (
                <div className="mt-6">
                  {task.options?.length ? <ChoiceList options={task.options} value={taskAnswer} onChange={setTaskAnswer} /> : <input className="field-control" value={taskAnswer} onChange={(event) => setTaskAnswer(event.target.value)} placeholder="Введите ответ" />}
                  {!answerFeedback && <Button className="mt-5" onClick={submitTask} disabled={!taskAnswer} loading={busy}>Проверить</Button>}
                  {answerFeedback && <div className={`mt-5 rounded-2xl p-4 ${answerFeedback.is_correct ? 'bg-mint-100 text-mint-700' : 'bg-amber-100 text-amber-900'}`}><strong>{answerFeedback.is_correct ? 'Верно' : 'Нужен ещё шаг'}</strong><p className="mt-1">{answerFeedback.feedback}</p>{answerFeedback.hint && <p className="mt-1">Подсказка: {answerFeedback.hint}</p>}</div>}
                  {answerFeedback && <div className="mt-5 flex flex-wrap gap-3"><select className="field-control max-w-xs" value={explanationMode} onChange={(event) => setExplanationMode(event.target.value)}><option value="short">Коротко</option><option value="steps">Пошагово</option><option value="real_life">Жизненный пример</option></select><Button variant="outline" onClick={requestExplanation} loading={busy}>Объяснить</Button></div>}
                  {explanation && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><DataSourceBadge ai meta={explanation} />{explanation.warning && <p className="mt-3 text-sm font-semibold text-amber-900">{explanation.warning}</p>}<div className="mt-3 text-stone-700">{typeof explanation.content === 'string' ? <p>{explanation.content}</p> : <><strong>{explanation.content?.title}</strong>{explanation.content?.steps?.map((item) => <p className="mt-2" key={item}>{item}</p>)}{explanation.content?.example && <p className="mt-2">{explanation.content.example}</p>}{explanation.content?.explanation && <p className="mt-2">{explanation.content.explanation}</p>}</>}</div></div>}
                  {answerFeedback && <Button className="mt-5" onClick={completeAttempt} loading={busy}>Завершить и обновить прогресс</Button>}
                </div>
              )}
            </Card>
          )}

          {result && path && !task && <Card className="p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-mint-700" /><h2 className="mt-4 text-2xl font-extrabold">Маршрут на сегодня завершён</h2><p className="mt-2 text-stone-600">Все доступные шаги выполнены. Следующее повторение появится по расписанию.</p></Card>}
        </div>

        <aside className="grid content-start gap-6">
          <Card className="p-6">
            <p className="eyebrow">Живой прогресс</p><p className="mt-4 text-5xl font-extrabold tabular-nums">{mastery}%</p>
            <ProgressBar className="mt-4" value={mastery} />
            <dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between"><dt className="text-stone-500">Освоено</dt><dd className="font-extrabold">{progress?.mastered_skills || 0}/{progress?.total_skills || 0}</dd></div><div className="flex justify-between"><dt className="text-stone-500">Пробелы</dt><dd className="font-extrabold">{progress?.weak_skills || 0}</dd></div></dl>
          </Card>
          <Card className="p-6">
            <p className="eyebrow">Карта знаний</p>
            <div className="mt-5 grid gap-4">
              {knowledgeMap?.nodes?.map((node) => <div key={node.id}><div className="flex justify-between gap-3 text-sm"><strong>{node.name}</strong><span className="text-stone-500">{Math.round(node.mastery * 100)}%</span></div><ProgressBar className="mt-2" value={Math.round(node.mastery * 100)} tone={node.mastery >= 0.8 ? 'mint' : 'violet'} /></div>) || <p className="text-sm text-stone-500">Карта появится после ответа backend.</p>}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
