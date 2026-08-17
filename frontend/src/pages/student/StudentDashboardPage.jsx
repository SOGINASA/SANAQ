import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock3, Flame, Map, MessageCircleQuestion, RotateCcw, Trophy } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { DailyStepCard } from '../../features/learning-path/DailyStepCard';
import { WeakSkillsList } from '../../features/progress/WeakSkillsList';
import { weeklyProgress } from '../../shared/data/mockData';
import mascot from '../../assets/images/sana-mascot.png';

const quickActions = [
  { title: 'Спросить SANA', text: 'Разобрать непонятный шаг', to: '/student/assistant', icon: MessageCircleQuestion, tone: 'bg-lavender-100 text-lavender-700' },
  { title: 'Открыть карту', text: 'Увидеть связи тем', to: '/student/knowledge-map', icon: Map, tone: 'bg-mint-100 text-mint-700' },
  { title: 'Повторить тему', text: '5 минут · 3 вопроса', to: '/student/path', icon: RotateCcw, tone: 'bg-[#FFE8E2] text-[#A74735]' },
];

export function StudentDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl animate-rise">
      <div className="mb-7 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="eyebrow">Понедельник, 17 августа</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Сәлем, Айару! Продолжим?</h1>
          <p className="mt-2 text-stone-600">На сегодня — один основной шаг и короткое повторение.</p>
        </div>
        <div className="flex items-center gap-4 rounded-3xl border border-lavender-200 bg-lavender-50 p-4">
          <img src={mascot} alt="SANA" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-lavender-700">Совет от SANA</p><p className="mt-1 text-sm font-semibold leading-6">Начни с главного урока. Я уже подготовила подсказки по сложным местам.</p></div>
        </div>
      </div>

      <section aria-labelledby="today-plan-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div><p className="eyebrow">Персональный план</p><h2 id="today-plan-title" className="mt-1 text-2xl font-extrabold">Сегодня</h2></div>
          <span className="rounded-full bg-paper px-4 py-2 text-sm font-bold text-stone-600 shadow-sm">1 из 3 выполнено</span>
        </div>
        <DailyStepCard />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <button onClick={() => navigate('/student/task/review')} className="group flex min-h-24 items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-lavender-300 hover:shadow-soft">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-100 text-mint-700"><Check className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-stone-400">Готово · 6 минут</span><span className="mt-1 block font-extrabold">Разминка: линейные уравнения</span></span>
            <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-lavender-600" />
          </button>
          <button onClick={() => navigate('/student/task/repeat')} className="group flex min-h-24 items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-lavender-300 hover:shadow-soft">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#FFE8E2] text-[#A74735]"><RotateCcw className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block text-xs font-bold uppercase tracking-wider text-stone-400">После урока · 5 минут</span><span className="mt-1 block font-extrabold">Повторить формулы сокращённого умножения</span></span>
            <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1 group-hover:text-lavender-600" />
          </button>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="text-xl font-extrabold">Быстрый доступ</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {quickActions.map(({ title, text, to, icon: Icon, tone }) => (
            <button key={title} onClick={() => navigate(to)} className="group flex items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span>
              <span className="flex-1"><span className="block font-extrabold">{title}</span><span className="mt-1 block text-sm text-stone-500">{text}</span></span>
              <ArrowRight className="h-5 w-5 text-stone-300 transition group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Flame, value: '12 дней', label: 'Учебная серия', tone: 'bg-[#FFE8E2] text-[#A74735]' },
              { icon: Trophy, value: '7 навыков', label: 'Освоено надолго', tone: 'bg-lime/30 text-[#52670A]' },
              { icon: Clock3, value: '32 мин', label: 'На этой неделе', tone: 'bg-mint-100 text-mint-700' },
            ].map(({ icon: Icon, value, label, tone }) => (
              <Card key={label} className="p-5"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-5 text-2xl font-extrabold">{value}</p><p className="mt-1 text-sm text-stone-500">{label}</p></Card>
            ))}
          </div>
          <Card className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Последние 7 дней</p><h2 className="mt-2 text-2xl font-extrabold">Ритм обучения</h2></div><CalendarDays className="h-6 w-6 text-lavender-600" /></div>
            <div className="bar-chart mt-7" aria-label="Активность по дням: Пн 45, Вт 68, Ср 36, Чт 82, Пт 58, Сб 94, Вс 72">{weeklyProgress.map((value, index) => <div key={index} style={{ height: `${value}%` }} title={`${value}%`} />)}</div>
            <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-stone-400">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}</div>
          </Card>
        </div>
        <Card className="p-6 sm:p-7">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Фокус недели</p><h2 className="mt-2 text-2xl font-extrabold">Что укрепить</h2></div><span className="rounded-full bg-[#FFE8E2] px-3 py-1 text-xs font-bold text-[#9B3D2D]">3 темы</span></div>
          <div className="mt-6"><WeakSkillsList /></div>
          <ProgressBar className="mt-7" value={73} label="Общий прогресс по цели" />
          <Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/student/progress')}>Подробный прогресс <ArrowRight className="h-5 w-5" /></Button>
        </Card>
      </div>
    </div>
  );
}
