import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react';
import { Button, Card } from '../../shared/ui';
import { subjects } from '../../shared/data/mockData';
import { useOnboardingStore } from '../../features/onboarding/onboardingStore';

const steps = ['Профиль', 'Предмет', 'Цель'];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { profile, updateProfile } = useOnboardingStore();
  const navigate = useNavigate();
  const next = () => step < 2 ? setStep(step + 1) : navigate('/student/diagnostic');
  return <div className="mx-auto max-w-4xl py-2 sm:py-8">
    <div className="mb-8"><p className="eyebrow">Настройка маршрута</p><h1 className="page-title mt-3">Расскажи, куда хочешь прийти</h1><p className="mt-3 text-stone-600">Три коротких шага — и диагностика будет проверять только нужное.</p></div>
    <div className="mb-8 flex items-center gap-2" aria-label={`Шаг ${step + 1} из 3`}>{steps.map((label, index) => <div key={label} className="flex flex-1 items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${index <= step ? 'bg-lavender-600 text-white' : 'bg-stone-200 text-stone-500'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span><span className="hidden text-sm font-bold sm:block">{label}</span>{index < 2 && <span className={`h-1 flex-1 rounded-full ${index < step ? 'bg-lavender-400' : 'bg-stone-200'}`} />}</div>)}</div>
    <Card className="p-6 sm:p-10">
      {step === 0 && <fieldset><legend className="text-2xl font-extrabold">В каком ты классе?</legend><p className="mt-2 text-stone-600">Мы подберём темы по школьной программе.</p><div className="mt-7 grid grid-cols-3 gap-3 sm:grid-cols-6">{['7', '8', '9', '10', '11', '12'].map((grade) => <label key={grade} className={`grid min-h-16 cursor-pointer place-items-center rounded-2xl border-2 text-lg font-extrabold transition ${profile.grade === grade ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="grade" value={grade} className="sr-only" checked={profile.grade === grade} onChange={() => updateProfile({ grade })} />{grade}</label>)}</div></fieldset>}
      {step === 1 && <fieldset><legend className="text-2xl font-extrabold">С какого предмета начнём?</legend><p className="mt-2 text-stone-600">Для MVP полностью подготовлен сценарий по математике.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{subjects.map((subject) => <label key={subject.id} className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${profile.subject === subject.id ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name="subject" className="sr-only" checked={profile.subject === subject.id} onChange={() => updateProfile({ subject: subject.id })} /><span className="grid h-11 w-11 place-items-center rounded-xl bg-paper"><Target className="h-5 w-5 text-lavender-600" /></span><span className="font-bold">{subject.name}</span></label>)}</div></fieldset>}
      {step === 2 && <fieldset><legend className="text-2xl font-extrabold">Какая цель сейчас главная?</legend><p className="mt-2 text-stone-600">Маршрут подстроит темп и приоритет тем.</p><div className="mt-7 grid gap-3">{[['exam', 'Подготовиться к экзамену', 'Закрыть базовые темы и выйти на стабильный результат'], ['olympiad', 'Готовиться к олимпиаде', 'Углублённые задачи и нестандартные связи'], ['review', 'Подтянуть школьную программу', 'Найти пробелы и идти в своём темпе']].map(([value, title, text]) => <label key={value} className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 ${profile.goal === value ? 'border-lavender-500 bg-lavender-100' : 'border-stone-200'}`}><input type="radio" name="goal" className="mt-1 h-5 w-5 accent-lavender-600" checked={profile.goal === value} onChange={() => updateProfile({ goal: value })} /><span><span className="block font-extrabold">{title}</span><span className="mt-1 block text-sm text-stone-600">{text}</span></span></label>)}</div></fieldset>}
      <div className="mt-10 flex items-center justify-between gap-3"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-5 w-5" /> Назад</Button><Button onClick={next}>{step === 2 ? 'Начать диагностику' : 'Продолжить'} <ArrowRight className="h-5 w-5" /></Button></div>
    </Card>
  </div>;
}
