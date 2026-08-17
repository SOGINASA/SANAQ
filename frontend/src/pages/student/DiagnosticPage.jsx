import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { diagnosticsApi } from '../../features/diagnostics/diagnosticsApi';
import { catalogApi } from '../../shared/api/catalogApi';
import { SpeechControls } from '../../features/accessibility';
import { useI18n } from '../../shared/i18n/i18n';

export function DiagnosticPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [diagnostic, setDiagnostic] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [pathId, setPathId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuestion = useCallback(async (id) => {
    const response = await diagnosticsApi.nextQuestion(id);
    setDiagnostic(response.data.diagnostic);
    setQuestion(response.data.question);
    if (!response.data.question && response.data.complete_ready) {
      const completed = await diagnosticsApi.complete(id);
      setResult(completed.data.result);
      setPathId(completed.data.learning_path_id);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const [profileResponse, historyResponse] = await Promise.all([
          catalogApi.studentProfile(), diagnosticsApi.history(),
        ]);
        if (!active) return;
        const profile = profileResponse.data.profile;
        if (!profile) {
          navigate('/student/onboarding', { replace: true });
          return;
        }
        const inProgress = historyResponse.data.items?.find((item) => item.status === 'in_progress');
        if (inProgress) {
          setDiagnostic(inProgress);
          await loadQuestion(inProgress.id);
          return;
        }
        const selection = location.state || {
          grade: profile.grade,
          subject_id: profile.subject_ids?.[0] || 'mathematics',
          goal_id: profile.goal_ids?.[0] || 'exam',
        };
        const created = await diagnosticsApi.create(selection);
        setDiagnostic(created.data.diagnostic);
        await loadQuestion(created.data.diagnostic.id);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => { active = false; };
  }, [loadQuestion, location.state, navigate]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await diagnosticsApi.answer(diagnostic.id, {
        question_id: question.id, answer, time_spent_seconds: 20, attempt_number: 1,
      });
      setAnswer('');
      await loadQuestion(diagnostic.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !question && !result) return <div className="mx-auto max-w-3xl py-16 text-center font-bold">{t('diagnostic.loading')}</div>;

  if (result) return <div className="mx-auto max-w-3xl py-8"><Card className="overflow-hidden"><div className="bg-lavender-100 p-8 text-center sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-600 text-white"><Sparkles className="h-8 w-8" /></span><p className="eyebrow mt-7">{t('diagnostic.complete')}</p><h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{t('diagnostic.growthFound')}</h1><p className="mx-auto mt-4 max-w-xl text-stone-600">{result.explanation}</p></div><div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">{[[`${Math.round(result.score * 100)}%`, t('diagnostic.score')], [result.gaps?.length || 0, t('diagnostic.gaps')], [result.strengths?.length || 0, t('diagnostic.strengths')]].map(([value, label]) => <div key={label} className="rounded-2xl bg-stone-100 p-5 text-center"><p className="font-display text-2xl font-semibold text-lavender-700">{value}</p><p className="mt-1 text-sm text-stone-600">{label}</p></div>)}</div><div className="border-t border-stone-200 p-6 sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="text-sm text-stone-500">{t('diagnostic.resultNote')}</p><Button className="mt-4 w-full sm:mt-0 sm:w-auto" onClick={() => navigate(`/student/generating-plan?path=${pathId}`)}>{t('diagnostic.openPlan')} <ArrowRight className="h-5 w-5" /></Button></div></Card></div>;

  return <div className="mx-auto max-w-3xl py-4 sm:py-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">{t('diagnostic.adaptive')}</p><h1 className="page-title mt-2">{t('diagnostic.title')}</h1></div><span className="inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-bold shadow-soft"><Clock3 className="h-4 w-4 text-lavender-600" /> {t('diagnostic.count', { current: diagnostic?.answered_questions || 0, total: diagnostic?.total_questions || 0 })}</span></div>
    {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    <ProgressBar className="mt-6" value={Math.round((diagnostic?.progress || 0) * 100)} label={t('diagnostic.progress')} />
    {question && <SpeechControls className="mt-5" text={[question.prompt, ...(question.options || [])].join('. ')} label={t('diagnostic.readQuestion')} />}
    {question && <Card className="mt-7 p-6 sm:p-10"><p className="text-sm font-bold text-lavender-600">{t('diagnostic.difficulty', { level: question.difficulty })}</p><h2 className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">{question.prompt}</h2>{question.options?.length ? <fieldset className="mt-8"><legend className="sr-only">{t('diagnostic.choose')}</legend><div className="grid gap-3 sm:grid-cols-2">{question.options.map((option, index) => <label key={option} className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 font-semibold ${answer === option ? 'border-lavender-500 bg-lavender-100 text-lavender-800' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" className="sr-only" checked={answer === option} onChange={() => setAnswer(option)} /><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${answer === option ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-500'}`}>{String.fromCharCode(65 + index)}</span>{option}{answer === option && <CheckCircle2 className="ml-auto h-5 w-5" />}</label>)}</div></fieldset> : <input className="field-control mt-8" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t('diagnostic.answerPlaceholder')} />}
      <div className="mt-9 flex justify-end"><Button loading={loading} disabled={!answer} onClick={submit}>{t('diagnostic.submit')} <ArrowRight className="h-5 w-5" /></Button></div></Card>}
  </div>;
}
