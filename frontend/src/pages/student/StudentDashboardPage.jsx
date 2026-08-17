import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataSourceBadge } from '../../components/feedback/DataSourceBadge';
import { aiTutorApi } from '../../features/ai-tutor/aiTutorApi';
import { assessmentsApi } from '../../features/assessments/assessmentsApi';
import { diagnosticsApi } from '../../features/diagnostics/diagnosticsApi';
import { knowledgeMapApi } from '../../features/knowledge-map/knowledgeMapApi';
import { learningPathApi } from '../../features/learning-path/learningPathApi';
import { progressApi } from '../../features/progress/progressApi';
import { useAuthStore } from '../../features/auth/authStore';
import { catalogApi } from '../../shared/api/catalogApi';

const DEFAULT_SELECTION = { grade: 9, subject_id: 'mathematics', goal_id: 'exam' };

export default function StudentDashboardPage() {
  const { user, logout } = useAuthStore();
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
      throw requestError;
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
    const response = await aiTutorApi.explanation({
      attempt_id: attempt.id,
      task_id: task.id,
      mode: explanationMode,
    });
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="mini-mark">S</span><strong>SANAQ</strong></div>
        <DataSourceBadge meta={sourceMeta} />
        <div className="user-menu"><span>{user?.name}</span><button className="text-button" onClick={logout}>Выйти</button></div>
      </header>

      <main className="dashboard">
        <section className="hero-row">
          <div>
            <p className="eyebrow">Математика · 9 класс</p>
            <h1>Твой следующий понятный шаг</h1>
            <p>Рекомендации строятся только из ответов, сохранённых backend.</p>
          </div>
          <div className="stage-strip" aria-label="Этап обучения">
            {['Профиль', 'Диагностика', 'Маршрут', 'Прогресс'].map((label, index) => (
              <span key={label} className={stage >= index + 1 ? 'stage-active' : ''}>{index + 1}. {label}</span>
            ))}
          </div>
        </section>

        {error && <div className="error-banner" role="alert"><strong>Данные не заменены fallback:</strong> {error}</div>}

        <div className="dashboard-grid">
          <section className="main-column">
            {!profile && (
              <article className="panel onboarding-panel">
                <p className="eyebrow">Шаг 1</p><h2>Настроим учебную цель</h2>
                <div className="form-grid">
                  <label>Класс<select value={selection.grade} onChange={(e) => setSelection({ ...selection, grade: e.target.value })}><option value="9">9 класс</option></select></label>
                  <label>Предмет<select value={selection.subject_id} onChange={(e) => setSelection({ ...selection, subject_id: e.target.value })}><option value="mathematics">Математика</option></select></label>
                  <label>Цель<select value={selection.goal_id} onChange={(e) => setSelection({ ...selection, goal_id: e.target.value })}><option value="exam">Подготовка к экзамену</option><option value="review">Повторение</option></select></label>
                </div>
                <button className="primary-button" onClick={saveProfile} disabled={busy}>Сохранить профиль</button>
              </article>
            )}

            {profile && !diagnostic && (
              <article className="panel start-panel">
                <div className="sana-orb">S</div><p className="eyebrow">SANA готова</p>
                <h2>Найдём точку максимального прогресса</h2>
                <p>6 коротких вопросов. Правильные ответы не раскрываются до завершения диагностики.</p>
                <button className="primary-button" onClick={startDiagnostic} disabled={busy}>Начать диагностику</button>
              </article>
            )}

            {diagnostic && !result && question && (
              <article className="panel question-panel">
                <div className="panel-heading"><div><p className="eyebrow">Диагностика · {Math.round((diagnostic.progress || 0) * 100)}%</p><h2>{question.prompt}</h2></div><span className="difficulty">Уровень {question.difficulty}</span></div>
                <div className="progress-track"><span style={{ width: `${(diagnostic.progress || 0) * 100}%` }} /></div>
                {question.options?.length ? (
                  <div className="option-list">{question.options.map((option) => <button key={option} className={diagnosticAnswer === option ? 'option selected' : 'option'} onClick={() => setDiagnosticAnswer(option)}>{option}</button>)}</div>
                ) : <input className="answer-input" value={diagnosticAnswer} onChange={(e) => setDiagnosticAnswer(e.target.value)} placeholder="Введите ответ" />}
                <button className="primary-button" disabled={!diagnosticAnswer || busy} onClick={submitDiagnostic}>Ответить</button>
              </article>
            )}

            {result && (
              <article className="panel result-panel">
                <div><p className="eyebrow">Результат диагностики</p><h2>{Math.round(result.score * 100)}% · уровень {result.level}</h2><p>{result.explanation}</p></div>
                <div className="result-stats"><span><strong>{result.strengths.length}</strong> сильных</span><span><strong>{result.gaps.length}</strong> пробелов</span></div>
              </article>
            )}

            {result && task && (
              <article className="panel task-panel">
                <div className="panel-heading"><div><p className="eyebrow">Шаг маршрута · {nextStep?.skill_name}</p><h2>{task.prompt}</h2></div><span className="difficulty">Сложность {task.difficulty}</span></div>
                <div className="why-box"><strong>Почему этот шаг:</strong> {nextStep?.reason}</div>
                {!attempt ? <button className="primary-button" onClick={startAttempt} disabled={busy}>Начать задание</button> : (
                  <>
                    {task.options?.length ? <div className="option-list">{task.options.map((option) => <button key={option} className={taskAnswer === option ? 'option selected' : 'option'} onClick={() => setTaskAnswer(option)}>{option}</button>)}</div> : <input className="answer-input" value={taskAnswer} onChange={(e) => setTaskAnswer(e.target.value)} placeholder="Введите ответ" />}
                    {!answerFeedback && <button className="primary-button" onClick={submitTask} disabled={!taskAnswer || busy}>Проверить</button>}
                    {answerFeedback && <div className={answerFeedback.is_correct ? 'feedback success' : 'feedback warning'}><strong>{answerFeedback.is_correct ? 'Верно' : 'Нужен ещё шаг'}</strong><p>{answerFeedback.feedback}</p>{answerFeedback.hint && <p>Подсказка: {answerFeedback.hint}</p>}</div>}
                    {answerFeedback && <div className="explanation-controls"><select value={explanationMode} onChange={(e) => setExplanationMode(e.target.value)}><option value="short">Коротко</option><option value="steps">Пошагово</option><option value="real_life">Жизненный пример</option></select><button className="secondary-button" onClick={requestExplanation}>Объяснить</button></div>}
                    {explanation && <div className="fallback-panel"><DataSourceBadge ai meta={explanation} /><p className="fallback-warning">{explanation.warning}</p>{typeof explanation.content === 'string' ? <p>{explanation.content}</p> : <><strong>{explanation.content.title}</strong>{explanation.content.steps?.map((item) => <p key={item}>{item}</p>)}{explanation.content.example && <p>{explanation.content.example}</p>}{explanation.content.explanation && <p>{explanation.content.explanation}</p>}</>}</div>}
                    {answerFeedback && <button className="primary-button" onClick={completeAttempt} disabled={busy}>Завершить и обновить прогресс</button>}
                  </>
                )}
              </article>
            )}

            {result && path && !task && <article className="panel completion-panel"><div className="sana-orb complete">✓</div><h2>Маршрут на сегодня завершён</h2><p>Все доступные шаги выполнены. Следующее повторение появится по расписанию.</p></article>}
          </section>

          <aside className="side-column">
            <article className="panel compact-panel"><p className="eyebrow">Живой прогресс</p><div className="mastery-ring" style={{ '--mastery': Math.round((progress?.overall_mastery || 0) * 100) }}><strong>{Math.round((progress?.overall_mastery || 0) * 100)}%</strong><span>mastery</span></div><div className="metric-row"><span>Освоено</span><strong>{progress?.mastered_skills || 0}/{progress?.total_skills || 6}</strong></div><div className="metric-row"><span>Пробелы</span><strong>{progress?.weak_skills ?? 6}</strong></div></article>
            <article className="panel compact-panel"><p className="eyebrow">Созвездие знаний</p><div className="knowledge-list">{knowledgeMap?.nodes?.map((node) => <div className="knowledge-node" key={node.id}><div><strong>{node.name}</strong><span>{node.status}</span></div><div className="node-track"><span style={{ width: `${node.mastery * 100}%` }} /></div></div>) || <p className="muted">Карта появится после подключения.</p>}</div></article>
          </aside>
        </div>
      </main>
    </div>
  );
}
