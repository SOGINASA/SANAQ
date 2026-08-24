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
import { useI18n } from '../../shared/i18n/i18n';
import { localizedText } from '../../shared/i18n/localizedText';
import { Button, Card, ProgressBar } from '../../shared/ui';

const DEFAULT_SELECTION = { grade: 9, subject_id: 'mathematics', goal_id: 'exam' };

function ChoiceList({ options = [], value, onChange, renderOption = (option) => option }) {
  return (
    <div className="grid gap-3">
      {options.map((option, index) => (
        <button
          key={typeof option === 'string' ? option : index}
          type="button"
          className={`min-h-12 rounded-2xl border-2 px-4 text-left font-semibold transition ${value === option ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}
          onClick={() => onChange(option)}
        >
          {renderOption(option)}
        </button>
      ))}
    </div>
  );
}

export function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const localize = useCallback((value) => localizedText(value, locale), [locale]);
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
        if (!profileResponse.data.profile) {
          navigate('/student/onboarding', { replace: true });
          return;
        }
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
  }, [loadPath, loadQuestion, navigate, refreshProgress]);

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
    <div className="mx-auto max-w-6xl animate-rise">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="eyebrow">{t('studentDashboard.subjectGrade')}</p>
          <h1 className="mt-2 break-words text-2xl font-extrabold sm:text-3xl">{user?.name ? t('studentDashboard.titleNamed', { name: user.name }) : t('studentDashboard.title')}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DataSourceBadge meta={sourceMeta} />
          <Button variant="ghost" size="sm" onClick={async () => { try { await logout(); } finally { navigate('/login'); } }}><LogOut className="h-4 w-4" /> {t('studentDashboard.logout')}</Button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-stone-200 bg-paper px-4 py-3" aria-label={t('studentDashboard.learningStage')}>
        <span className="shrink-0 text-sm font-bold text-stone-600">{t('studentDashboard.stageCount', { stage })}</span>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((item) => <span key={item} className={`h-2 rounded-full ${stage >= item ? 'bg-lavender-500' : 'bg-stone-200'}`} />)}
        </div>
        <span className="hidden text-sm font-semibold text-lavender-700 sm:block">{t(`studentDashboard.stages.${stage - 1}`)}</span>
      </div>

      {profile && result && (
        <section className="today-focus mt-6 overflow-hidden rounded-4xl bg-ink text-white shadow-soft" aria-labelledby="today-focus-title">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-lime"><Sparkles className="h-4 w-4" />{t('learningPath.nextStep')}</div>
              <h2 id="today-focus-title" className="mt-3 break-words font-display text-2xl font-semibold sm:text-3xl">{task ? localize(task.prompt) : t('studentDashboard.pathComplete')}</h2>
              <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-stone-300">{task ? localize(nextStep?.reason) : t('studentDashboard.pathCompleteText')}</p>
              {task && <Button className="mt-6" onClick={attempt ? () => document.getElementById('current-task')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : startAttempt} loading={busy}>{attempt ? t('studentDashboard.answer') : t('studentDashboard.startTask')} <ArrowRight className="h-4 w-4" /></Button>}
            </div>
            <div className="grid grid-cols-3 border-t border-white/10 bg-white/[0.06] lg:min-w-[310px] lg:border-l lg:border-t-0">
              <div className="p-4 text-center sm:p-5"><strong className="font-display text-xl text-lime sm:text-2xl">{mastery}%</strong><span className="mt-1 block text-[11px] text-stone-400">{t('studentDashboard.liveProgress')}</span></div>
              <div className="border-x border-white/10 p-4 text-center sm:p-5"><strong className="font-display text-xl sm:text-2xl">{progress?.mastered_skills || 0}</strong><span className="mt-1 block text-[11px] text-stone-400">{t('studentDashboard.mastered')}</span></div>
              <div className="p-4 text-center sm:p-5"><strong className="font-display text-xl sm:text-2xl">{progress?.weak_skills || 0}</strong><span className="mt-1 block text-[11px] text-stone-400">{t('studentDashboard.gapsTitle')}</span></div>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
          <strong>{t('studentDashboard.backendError')}</strong> {error}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-6">
          {!profile && (
            <Card className="p-6 sm:p-8">
              <p className="eyebrow">{t('studentDashboard.stepOne')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('studentDashboard.setupGoal')}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <label className="field-label">{t('studentDashboard.grade')}<select className="field-control mt-2" value={selection.grade} onChange={(event) => setSelection({ ...selection, grade: event.target.value })}><option value="9">{t('studentDashboard.gradeNine')}</option></select></label>
                <label className="field-label">{t('studentDashboard.subject')}<select className="field-control mt-2" value={selection.subject_id} onChange={(event) => setSelection({ ...selection, subject_id: event.target.value })}><option value="mathematics">{t('studentDashboard.mathematics')}</option></select></label>
                <label className="field-label">{t('studentDashboard.goal')}<select className="field-control mt-2" value={selection.goal_id} onChange={(event) => setSelection({ ...selection, goal_id: event.target.value })}><option value="exam">{t('studentDashboard.exam')}</option><option value="review">{t('studentDashboard.review')}</option></select></label>
              </div>
              <Button className="mt-6" onClick={saveProfile} loading={busy}>{t('studentDashboard.saveProfile')} <ArrowRight className="h-4 w-4" /></Button>
            </Card>
          )}

          {profile && !diagnostic && (
            <Card className="p-7 sm:p-10">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Sparkles className="h-6 w-6" /></span>
              <p className="eyebrow mt-6">{t('studentDashboard.sanaReady')}</p><h2 className="mt-2 text-3xl font-extrabold">{t('studentDashboard.findGrowth')}</h2>
              <p className="mt-3 text-stone-600">{t('studentDashboard.diagnosticDescription')}</p>
              <Button className="mt-6" onClick={startDiagnostic} loading={busy}>{t('studentDashboard.startDiagnostic')}</Button>
            </Card>
          )}

          {diagnostic && !result && question && (
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t('studentDashboard.diagnostic')}</p><h2 className="mt-2 text-2xl font-extrabold">{localize(question.prompt)}</h2></div><span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-bold">{t('studentDashboard.level', { level: question.difficulty })}</span></div>
              <ProgressBar className="my-6" value={Math.round((diagnostic.progress || 0) * 100)} label={t('studentDashboard.completed')} />
              {question.options?.length ? <ChoiceList options={question.options} value={diagnosticAnswer} onChange={setDiagnosticAnswer} renderOption={localize} /> : <input className="field-control" value={diagnosticAnswer} onChange={(event) => setDiagnosticAnswer(event.target.value)} placeholder={t('studentDashboard.answerPlaceholder')} />}
              <Button className="mt-6" disabled={!diagnosticAnswer} loading={busy} onClick={submitDiagnostic}>{t('studentDashboard.answer')}</Button>
            </Card>
          )}

          {result && !task && (
            <Card className="border-mint-300 bg-mint-50 p-6 sm:p-8">
              <p className="eyebrow text-mint-700">{t('studentDashboard.diagnosticResult')}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-extrabold">{t('studentDashboard.scoreLevel', { score: Math.round(result.score * 100), level: result.level })}</h2><p className="mt-2 max-w-2xl text-stone-600">{localize(result.explanation)}</p></div><div className="flex gap-2"><span className="rounded-2xl bg-paper px-4 py-3 text-sm"><strong className="block text-xl">{result.strengths?.length || 0}</strong>{t('studentDashboard.strengths')}</span><span className="rounded-2xl bg-paper px-4 py-3 text-sm"><strong className="block text-xl">{result.gaps?.length || 0}</strong>{t('studentDashboard.gaps')}</span></div></div>
            </Card>
          )}

          {task && (
            <Card id="current-task" className="p-6 sm:p-8">
              <p className="eyebrow">{t('studentDashboard.pathStep', { skill: localize(nextStep?.skill_name) })}</p><h2 className="mt-2 text-2xl font-extrabold">{localize(task.prompt)}</h2>
              <div className="mt-5 rounded-2xl border-l-4 border-lavender-500 bg-lavender-50 p-4 text-sm text-stone-700"><strong>{t('studentDashboard.whyStep')}</strong> {localize(nextStep?.reason)}</div>
              {!attempt ? <Button className="mt-6" onClick={startAttempt} loading={busy}>{t('studentDashboard.startTask')}</Button> : (
                <div className="mt-6">
                  {task.options?.length ? <ChoiceList options={task.options} value={taskAnswer} onChange={setTaskAnswer} renderOption={localize} /> : <input className="field-control" value={taskAnswer} onChange={(event) => setTaskAnswer(event.target.value)} placeholder={t('studentDashboard.answerPlaceholder')} />}
                  {!answerFeedback && <Button className="mt-5" onClick={submitTask} disabled={!taskAnswer} loading={busy}>{t('studentDashboard.check')}</Button>}
                  {answerFeedback && <div className={`mt-5 rounded-2xl p-4 ${answerFeedback.is_correct ? 'bg-mint-100 text-mint-700' : 'bg-amber-100 text-amber-900'}`}><strong>{t(answerFeedback.is_correct ? 'studentDashboard.correct' : 'studentDashboard.anotherStep')}</strong><p className="mt-1">{localize(answerFeedback.feedback)}</p>{answerFeedback.hint && <p className="mt-1">{t('studentDashboard.hint')} {localize(answerFeedback.hint)}</p>}</div>}
                  {answerFeedback && <div className="mt-5 flex flex-wrap gap-3"><select className="field-control max-w-xs" value={explanationMode} onChange={(event) => setExplanationMode(event.target.value)}><option value="short">{t('studentDashboard.short')}</option><option value="steps">{t('studentDashboard.steps')}</option><option value="real_life">{t('studentDashboard.realLife')}</option></select><Button variant="outline" onClick={requestExplanation} loading={busy}>{t('studentDashboard.explain')}</Button></div>}
                  {explanation && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><DataSourceBadge ai meta={explanation} />{explanation.warning && <p className="mt-3 text-sm font-semibold text-amber-900">{localize(explanation.warning)}</p>}<div className="mt-3 text-stone-700">{typeof explanation.content === 'string' ? <p>{explanation.content}</p> : <><strong>{localize(explanation.content?.title)}</strong>{explanation.content?.steps?.map((item, index) => <p className="mt-2" key={index}>{localize(item)}</p>)}{explanation.content?.example && <p className="mt-2">{localize(explanation.content.example)}</p>}{explanation.content?.explanation && <p className="mt-2">{localize(explanation.content.explanation)}</p>}</>}</div></div>}
                  {answerFeedback && <Button className="mt-5" onClick={completeAttempt} loading={busy}>{t('studentDashboard.finish')}</Button>}
                </div>
              )}
            </Card>
          )}

          {result && path && !task && <Card className="p-8 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-mint-700" /><h2 className="mt-4 text-2xl font-extrabold">{t('studentDashboard.pathComplete')}</h2><p className="mt-2 text-stone-600">{t('studentDashboard.pathCompleteText')}</p></Card>}
        </div>

        <aside className="grid content-start gap-5">
          <Card className="min-w-0 overflow-hidden p-5">
            <p className="eyebrow">{t('studentDashboard.liveProgress')}</p><p className="mt-4 text-5xl font-extrabold tabular-nums">{mastery}%</p>
            <ProgressBar className="mt-4" value={mastery} />
            <dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between"><dt className="text-stone-500">{t('studentDashboard.mastered')}</dt><dd className="font-extrabold">{progress?.mastered_skills || 0}/{progress?.total_skills || 0}</dd></div><div className="flex justify-between"><dt className="text-stone-500">{t('studentDashboard.gapsTitle')}</dt><dd className="font-extrabold">{progress?.weak_skills || 0}</dd></div></dl>
          </Card>
          <Card className="min-w-0 overflow-hidden p-5">
            <p className="break-words eyebrow">{t('studentDashboard.knowledgeMap')}</p>
            <div className="mt-5 grid gap-4">
              {knowledgeMap?.nodes?.length ? knowledgeMap.nodes.slice(0, 4).map((node) => <div key={node.id} className="min-w-0"><div className="flex min-w-0 items-start justify-between gap-3 text-sm"><strong className="min-w-0 flex-1 break-words leading-5 [overflow-wrap:anywhere]">{localize(node.name)}</strong><span className="shrink-0 text-stone-500">{Math.round(node.mastery * 100)}%</span></div><ProgressBar className="mt-2" value={Math.round(node.mastery * 100)} tone={node.mastery >= 0.8 ? 'mint' : 'violet'} /></div>) : <p className="break-words text-sm text-stone-500">{t('studentDashboard.mapAfterDiagnostic')}</p>}
            </div>
            {knowledgeMap?.nodes?.length > 4 && <Button className="mt-5 w-full" size="sm" variant="ghost" onClick={() => navigate('/student/knowledge-map')}>{t('studentDashboard.openMap')}</Button>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
