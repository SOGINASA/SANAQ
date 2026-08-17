import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  MessageCircleQuestion,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button, Card, Dialog, ProgressBar } from '../../shared/ui';

const nextSteps = [
  {
    id: 'quadratics',
    title: 'Квадратные уравнения',
    description: 'Научишься находить корни через дискриминант.',
    meta: '5 уроков · около 25 минут',
    status: 'next',
  },
  {
    id: 'functions',
    title: 'Графики функций',
    description: 'Откроется после квадратных уравнений.',
    meta: '4 урока · около 22 минут',
    status: 'locked',
  },
];

export function LearningPathPage() {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [studyMinutes, setStudyMinutes] = useState('20 мин');

  return (
    <div className="mx-auto w-full max-w-6xl animate-rise overflow-x-hidden">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-lavender-100 px-3 py-1.5 text-xs font-extrabold text-lavender-700"><Sparkles className="h-4 w-4" /> План составлен AI</div>
          <h1 className="page-title mt-4">План учёбы</h1>
          <p className="mt-3 max-w-2xl text-stone-600">SANA выбрала порядок тем по результатам диагностики. Тебе нужно делать только один шаг за раз.</p>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)} className="w-full sm:w-auto"><SlidersHorizontal className="h-5 w-5" /> Настроить план</Button>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]" aria-labelledby="goal-title">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Твоя цель</p>
              <h2 id="goal-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">Подготовиться к экзамену</h2>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-stone-600">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-lavender-600" /> До 15 октября</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-lavender-600" /> 20 минут в день</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-3xl bg-canvas p-4 sm:min-w-48">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-xl font-extrabold text-ink">73%</span>
              <span><span className="block text-sm font-extrabold">По плану</span><span className="block text-xs text-stone-500">3 из 12 шагов</span></span>
            </div>
          </div>
          <ProgressBar className="mt-6" value={73} label="Готовность к цели" />
        </Card>

        <Card className="border-lavender-200 bg-lavender-50 p-6 sm:p-7">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender-600 text-white"><Target className="h-5 w-5" /></span>
          <h2 className="mt-5 text-lg font-extrabold">Почему такой порядок?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Сначала закроем один базовый пробел. После этого следующие темы пойдут быстрее.</p>
          <button onClick={() => setWhyOpen(true)} className="mt-4 min-h-11 rounded-xl text-sm font-extrabold text-lavender-700">Посмотреть объяснение</button>
        </Card>
      </section>

      <section className="mt-8" aria-labelledby="today-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><p className="eyebrow">Шаг 4 из 12</p><h2 id="today-title" className="mt-1 text-2xl font-extrabold">Сегодня</h2></div>
          <span className="hidden rounded-full bg-mint-100 px-3 py-1.5 text-xs font-bold text-mint-700 sm:inline-flex">Около 18 минут</span>
        </div>

        <Card className="overflow-hidden border-lavender-300">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime text-ink"><Play className="h-5 w-5 fill-current" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-lavender-700">Главный урок</p>
                  <h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">Разложение на множители</h3>
                  <p className="mt-3 max-w-2xl leading-7 text-stone-600">Разберёшь формулу разности квадратов и решишь четыре коротких задания.</p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  [CheckCircle2, 'Теория', '6 минут', true],
                  [Play, 'Практика', '8 минут', false],
                  [Check, 'Проверка', '4 минуты', false],
                ].map(([Icon, title, time, done]) => <div key={title} className={`flex items-center gap-3 rounded-2xl p-4 ${done ? 'bg-mint-100' : 'bg-canvas'}`}><Icon className={`h-5 w-5 shrink-0 ${done ? 'text-mint-700' : 'text-stone-400'}`} /><span><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-stone-500">{done ? 'Готово' : time}</span></span></div>)}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={() => navigate('/student/learn/factorization')} className="w-full sm:w-auto">Продолжить урок <ArrowRight className="h-5 w-5" /></Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/student/assistant')} className="w-full sm:w-auto"><MessageCircleQuestion className="h-5 w-5" /> Спросить SANA</Button>
              </div>
            </div>

            <div className="border-t border-stone-200 bg-ink p-6 text-white sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-extrabold uppercase tracking-wider text-lime">Результат шага</p>
              <h3 className="mt-4 text-xl font-extrabold">Откроются квадратные уравнения</h3>
              <p className="mt-3 text-sm leading-7 text-stone-400">Нужно набрать 70% на короткой проверке. Сейчас освоение темы — 68%.</p>
              <ProgressBar className="mt-6" value={68} label="Освоено" tone="mint" />
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-9" aria-labelledby="next-title">
        <div className="mb-4"><p className="eyebrow">После сегодняшнего урока</p><h2 id="next-title" className="mt-1 text-2xl font-extrabold">Что дальше</h2></div>
        <div className="space-y-3">
          <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-paper p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-100 text-mint-700"><RotateCcw className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-extrabold">Короткое повторение</h3><span className="rounded-full bg-mint-100 px-2.5 py-1 text-xs font-bold text-mint-700">Завтра</span></div><p className="mt-1 text-sm text-stone-500">3 вопроса · около 5 минут</p></div>
            <Button variant="outline" onClick={() => navigate('/student/task/review')} className="w-full sm:w-auto">Открыть</Button>
          </div>

          {nextSteps.map((step, index) => {
            const locked = step.status === 'locked';
            return <div key={step.id} className={`flex flex-col gap-4 rounded-3xl border border-stone-200 bg-paper p-5 sm:flex-row sm:items-center sm:p-6 ${locked ? 'opacity-60' : ''}`}>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-extrabold ${locked ? 'bg-stone-200 text-stone-500' : 'bg-lavender-100 text-lavender-700'}`}>{locked ? <LockKeyhole className="h-5 w-5" /> : index + 5}</span>
              <div className="min-w-0 flex-1"><h3 className="text-lg font-extrabold">{step.title}</h3><p className="mt-1 text-sm leading-6 text-stone-600">{step.description}</p><p className="mt-2 text-xs font-bold text-stone-400">{step.meta}</p></div>
              <Button variant="outline" disabled={locked} onClick={() => navigate(`/student/learn/${step.id}`)} className="w-full sm:w-auto">{locked ? 'Закрыто' : 'Посмотреть'}</Button>
            </div>;
          })}
        </div>
      </section>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Настроить план" description="SANA пересчитает нагрузку, но сохранит зависимости между темами." footer={<><Button variant="ghost" onClick={() => setSettingsOpen(false)}>Отмена</Button><Button onClick={() => navigate('/student/generating-plan?mode=refresh')}>Обновить план</Button></>}>
        <div className="space-y-6">
          <fieldset><legend className="field-label">Сколько времени удобно заниматься?</legend><div className="grid grid-cols-3 gap-2">{['10 мин', '20 мин', '30 мин'].map((time) => <label key={time} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 text-sm font-bold transition ${studyMinutes === time ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200'}`}><input type="radio" name="study-time" checked={studyMinutes === time} onChange={() => setStudyMinutes(time)} className="sr-only" />{time}</label>)}</div></fieldset>
          <div><label className="field-label" htmlFor="study-days">Дни занятий</label><select id="study-days" className="field-control"><option>Понедельник — пятница</option><option>Каждый день</option><option>Три раза в неделю</option></select></div>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-lavender-50 p-4 text-sm font-semibold"><input type="checkbox" defaultChecked className="mt-0.5 h-5 w-5 shrink-0 accent-lavender-600" /><span>Добавлять короткие повторения, чтобы темы не забывались</span></label>
        </div>
      </Dialog>

      <Dialog open={whyOpen} onClose={() => setWhyOpen(false)} title="Почему AI выбрал этот план" description="Решение основано на диагностике и связях между навыками." footer={<Button onClick={() => setWhyOpen(false)}>Понятно</Button>}>
        <ol className="space-y-4">
          {[
            ['Диагностика', 'Ты уверенно решаешь линейные уравнения — возвращаться к ним полностью не нужно.'],
            ['Найденный пробел', 'В формуле разности квадратов были две ошибки из трёх.'],
            ['Следующий шаг', 'Если закрепить разложение на множители, квадратные уравнения станут заметно проще.'],
          ].map(([title, text], index) => <li key={title} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-sm font-extrabold text-lavender-700">{index + 1}</span><span><span className="block font-extrabold">{title}</span><span className="mt-1 block text-sm leading-6 text-stone-600">{text}</span></span></li>)}
        </ol>
      </Dialog>

    </div>
  );
}
