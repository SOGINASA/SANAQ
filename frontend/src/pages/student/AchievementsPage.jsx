import { Award, Brain, Flame, Gem, ShieldCheck, Sparkles } from 'lucide-react';
import { Card, ProgressBar } from '../../shared/ui';

export function AchievementsPage() {
  const items = [
    { icon: Flame, title: 'Ритм найден', text: 'Учись 7 дней подряд', unlocked: true },
    { icon: Brain, title: 'Знание надолго', text: 'Сохрани 5 навыков после повторения', unlocked: true },
    { icon: Sparkles, title: 'Спросил по-разному', text: 'Используй все 3 режима объяснения', unlocked: true },
    { icon: Gem, title: 'Без подсказок', text: 'Реши 5 заданий подряд самостоятельно', unlocked: false },
    { icon: ShieldCheck, title: 'Крепкая база', text: 'Освой все базовые навыки темы', unlocked: false },
    { icon: Award, title: 'Маршрут завершён', text: 'Дойди до своей первой цели', unlocked: false },
  ];
  return <div className="mx-auto max-w-6xl animate-rise"><div><p className="eyebrow">Не за клики, а за знания</p><h1 className="page-title mt-3">Достижения</h1><p className="mt-3 text-stone-600">SANAQ отмечает устойчивый прогресс и полезные учебные привычки.</p></div><Card className="mt-8 overflow-hidden bg-ink p-7 text-white sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-lime">Уровень 4 · Исследователь</p><h2 className="mt-2 font-display text-3xl font-semibold">7 навыков сохранены надолго</h2></div><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[10px] border-lime/30 bg-lime text-center font-display text-2xl font-semibold text-ink">73%</div></div><ProgressBar className="mt-7" value={73} /></Card><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(({ icon: Icon, title, text, unlocked }) => <Card key={title} className={`p-6 ${!unlocked ? 'opacity-55' : ''}`}><span className={`grid h-14 w-14 place-items-center rounded-2xl ${unlocked ? 'bg-lime text-ink' : 'bg-stone-200 text-stone-500'}`}><Icon className="h-7 w-7" /></span><h2 className="mt-6 text-xl font-extrabold">{title}</h2><p className="mt-2 text-sm text-stone-500">{text}</p><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-lavender-600">{unlocked ? 'Получено' : 'Ещё впереди'}</p></Card>)}</div></div>;
}
