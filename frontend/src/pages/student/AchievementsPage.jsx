import { useEffect, useState } from 'react';
import { Award, Brain, Flame, Gem } from 'lucide-react';
import { Card, ProgressBar } from '../../shared/ui';
import { gamificationApi } from '../../features/gamification/gamificationApi';

const icons = [Flame, Brain, Gem, Award];

export function AchievementsPage() {
  const [items, setItems] = useState([]);
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([gamificationApi.achievements(), gamificationApi.streak()])
      .then(([achievementResponse, streakResponse]) => { setItems(achievementResponse.data.items || []); setStreak(streakResponse.data); })
      .catch((requestError) => setError(requestError.message));
  }, []);
  const earned = items.filter((item) => item.earned).length;
  const percent = items.length ? Math.round(earned / items.length * 100) : 0;
  return <div className="mx-auto max-w-6xl animate-rise"><div><p className="eyebrow">Не за клики, а за знания</p><h1 className="page-title mt-3">Достижения</h1><p className="mt-3 text-stone-600">Статусы рассчитываются по сохранённым попыткам и mastery.</p></div>{error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}<Card className="mt-8 overflow-hidden bg-ink p-7 text-white sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-lime">Текущая серия · {streak?.current || 0} дн.</p><h2 className="mt-2 font-display text-3xl font-semibold">Получено {earned} из {items.length} достижений</h2></div><div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[10px] border-lime/30 bg-lime text-center font-display text-2xl font-semibold text-ink">{percent}%</div></div><ProgressBar className="mt-7" value={percent} /></Card><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => { const Icon = icons[index % icons.length]; return <Card key={item.id} className={`p-6 ${!item.earned ? 'opacity-55' : ''}`}><span className={`grid h-14 w-14 place-items-center rounded-2xl ${item.earned ? 'bg-lime text-ink' : 'bg-stone-200 text-stone-500'}`}><Icon className="h-7 w-7" /></span><h2 className="mt-6 text-xl font-extrabold">{item.title}</h2><p className="mt-2 text-sm text-stone-500">{item.description}</p><ProgressBar className="mt-4" value={Math.round(item.progress / item.target * 100)} /><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-lavender-600">{item.earned ? 'Получено' : `${item.progress}/${item.target}`}</p></Card>; })}</div></div>;
}
