import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react';
import { Button, Card } from '../../shared/ui';
import { catalogApi } from '../../shared/api/catalogApi';
import { useI18n } from '../../shared/i18n/i18n';
import { localizedText } from '../../shared/i18n/localizedText';

const steps = ['Профиль', 'Предмет', 'Цель'];

export function OnboardingPage() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ grade: '', subject_id: '', goal_id: '' });
  const [catalog, setCatalog] = useState({ grades: [], subjects: [], goals: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
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
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, [locale]);

  const next = async () => {
    if (step < 2) {
      setStep((value) => value + 1);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await catalogApi.saveStudentProfile({
        grade: Number(profile.grade), subject_ids: [profile.subject_id],
        goal_ids: [profile.goal_id], level: 'diagnostic_pending',
      });
      navigate('/student/diagnostic', { state: profile });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-4xl py-16 text-center font-bold">Загружаем учебный каталог…</div>;

  return <div className="mx-auto max-w-4xl py-2 sm:py-8">
    <div className="mb-8"><p className="eyebrow">Настройка маршрута</p><h1 className="page-title mt-3">Расскажи, куда хочешь прийти</h1><p className="mt-3 text-stone-600">Профиль сохраняется в SANAQ Backend и определяет реальную диагностику.</p></div>
    {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    <div className="mb-8 flex items-center gap-2" aria-label={`Шаг ${step + 1} из 3`}>{steps.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${index <= step ? 'bg-lavender-600 text-white' : 'bg-stone-200 text-stone-500'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span><span className="hidden text-sm font-bold sm:block">{label}</span>{index < 2 && <span className={`h-1 flex-1 rounded-full ${index < step ? 'bg-lavender-400' : 'bg-stone-200'}`} />}</div>)}</div>
    <Card className="p-6 sm:p-10">
      {step === 0 && <fieldset><legend className="text-2xl font-extrabold">В каком ты классе?</legend><p className="mt-2 text-stone-600">Мы подберём темы по школьной программе.</p><div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-6">{catalog.grades.map((grade) => <label key={grade} className={`grid min-h-16 cursor-pointer place-items-center rounded-2xl border-2 text-lg font-extrabold transition ${Number(profile.grade) === Number(grade) ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="grade" className="sr-only" checked={Number(profile.grade) === Number(grade)} onChange={() => setProfile({ ...profile, grade })} />{grade}</label>)}</div></fieldset>}
      {step === 1 && <fieldset><legend className="text-2xl font-extrabold">С какого предмета начнём?</legend><p className="mt-2 text-stone-600">Показаны предметы, опубликованные в backend-каталоге.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{catalog.subjects.map((subject) => <label key={subject.id} className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${profile.subject_id === subject.id ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="subject" className="sr-only" checked={profile.subject_id === subject.id} onChange={() => setProfile({ ...profile, subject_id: subject.id })} /><span className="grid h-11 w-11 place-items-center rounded-xl bg-paper"><Target className="h-5 w-5 text-lavender-600" /></span><span className="font-bold">{subject.name}</span></label>)}</div></fieldset>}
      {step === 2 && <fieldset><legend className="text-2xl font-extrabold">Какая цель сейчас главная?</legend><p className="mt-2 text-stone-600">Маршрут подстроит темп и приоритет тем.</p><div className="mt-7 grid gap-3">{catalog.goals.map((goal) => <label key={goal.id} className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 ${profile.goal_id === goal.id ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200'}`}><input type="radio" name="goal" className="mt-1 h-5 w-5 accent-lavender-600" checked={profile.goal_id === goal.id} onChange={() => setProfile({ ...profile, goal_id: goal.id })} /><span className="font-extrabold">{goal.name}</span></label>)}</div></fieldset>}
      <div className="mt-10 flex items-center justify-between gap-3"><Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}><ArrowLeft className="h-5 w-5" /> Назад</Button><Button loading={saving} onClick={next}>{step === 2 ? 'Сохранить и начать диагностику' : 'Продолжить'} <ArrowRight className="h-5 w-5" /></Button></div>
    </Card>
  </div>;
}
