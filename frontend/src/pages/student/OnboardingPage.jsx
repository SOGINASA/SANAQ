import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react';
import { Button, Card } from '../../shared/ui';
import { catalogApi } from '../../shared/api/catalogApi';
import { useI18n } from '../../shared/i18n/i18n';
import { localizedText } from '../../shared/i18n/localizedText';

export function OnboardingPage() {
  const { locale, t } = useI18n();
  const navigate = useNavigate();
  const steps = [t('onboarding.profile'), t('onboarding.subject'), t('onboarding.goal')];
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ grade: '', subject_id: '', goal_id: '' });
  const [catalog, setCatalog] = useState({ grades: [], subjects: [], goals: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([catalogApi.grades(), catalogApi.subjects(), catalogApi.goals(), catalogApi.studentProfile()])
      .then(([grades, subjects, goals, current]) => {
        if (!active) return;
        setCatalog({
          grades: grades.data.items,
          subjects: (subjects.data.items || []).map((item) => ({ ...item, name: localizedText(item.name, locale) })),
          goals: (goals.data.items || []).map((item) => ({ ...item, name: localizedText(item.name, locale) })),
        });
        setProfile({
          grade: current.data.profile?.grade || grades.data.items?.[0] || '',
          subject_id: current.data.profile?.subject_ids?.[0] || subjects.data.items?.[0]?.id || '',
          goal_id: current.data.profile?.goal_ids?.[0] || goals.data.items?.[0]?.id || '',
        });
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale]);

  const next = async () => {
    if (step < 2) return setStep((value) => value + 1);
    setSaving(true);
    setError('');
    try {
      await catalogApi.saveStudentProfile({ grade: Number(profile.grade), subject_ids: [profile.subject_id], goal_ids: [profile.goal_id], level: 'diagnostic_pending' });
      navigate('/student/diagnostic', { state: profile });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl py-16 text-center font-bold">{t('onboarding.loading')}</div>;

  return <div className="mx-auto max-w-4xl py-2 sm:py-8">
    <div className="mb-8"><p className="eyebrow">{t('onboarding.eyebrow')}</p><h1 className="page-title mt-3">{t('onboarding.title')}</h1><p className="mt-3 text-stone-600">{t('onboarding.description')}</p></div>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    <div className="mb-8 flex items-center gap-2" aria-label={t('onboarding.step', { current: step + 1, total: 3 })}>{steps.map((label, index) => <div key={label} className="flex min-w-0 flex-1 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${index <= step ? 'bg-lavender-600 text-white' : 'bg-stone-200 text-stone-500'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span><span className="hidden truncate text-sm font-bold sm:block">{label}</span>{index < 2 && <span className={`h-1 min-w-3 flex-1 rounded-full ${index < step ? 'bg-lavender-400' : 'bg-stone-200'}`} />}</div>)}</div>
    <Card className="p-6 sm:p-10">
      {step === 0 && <fieldset><legend className="text-2xl font-extrabold">{t('onboarding.gradeTitle')}</legend><p className="mt-2 text-stone-600">{t('onboarding.gradeText')}</p><div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-6">{catalog.grades.map((grade) => <label key={grade} className={`grid min-h-16 cursor-pointer place-items-center rounded-2xl border-2 text-lg font-extrabold transition ${Number(profile.grade) === Number(grade) ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="grade" className="sr-only" checked={Number(profile.grade) === Number(grade)} onChange={() => setProfile({ ...profile, grade })} />{grade}</label>)}</div></fieldset>}
      {step === 1 && <fieldset><legend className="text-2xl font-extrabold">{t('onboarding.subjectTitle')}</legend><p className="mt-2 text-stone-600">{t('onboarding.subjectText')}</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{catalog.subjects.map((subject) => <label key={subject.id} className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${profile.subject_id === subject.id ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="subject" className="sr-only" checked={profile.subject_id === subject.id} onChange={() => setProfile({ ...profile, subject_id: subject.id })} /><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper"><Target className="h-5 w-5 text-lavender-600" /></span><span className="break-words font-bold">{subject.name}</span></label>)}</div></fieldset>}
      {step === 2 && <fieldset><legend className="text-2xl font-extrabold">{t('onboarding.goalTitle')}</legend><p className="mt-2 text-stone-600">{t('onboarding.goalText')}</p><div className="mt-7 grid gap-3">{catalog.goals.map((goal) => <label key={goal.id} className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 ${profile.goal_id === goal.id ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200'}`}><input type="radio" name="goal" className="mt-1 h-5 w-5 shrink-0 accent-lavender-600" checked={profile.goal_id === goal.id} onChange={() => setProfile({ ...profile, goal_id: goal.id })} /><span className="break-words font-extrabold">{goal.name}</span></label>)}</div></fieldset>}
      <div className="mt-10 flex flex-col-reverse gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"><Button className="w-full min-[420px]:w-auto" variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}><ArrowLeft className="h-5 w-5" /> {t('onboarding.back')}</Button><Button className="w-full min-[420px]:w-auto" loading={saving} onClick={next}>{step === 2 ? t('onboarding.save') : t('onboarding.continue')} <ArrowRight className="h-5 w-5" /></Button></div>
    </Card>
  </div>;
}
