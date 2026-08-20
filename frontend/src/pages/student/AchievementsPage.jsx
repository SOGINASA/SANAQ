import { useEffect, useState } from 'react';
import { Award, Brain, Flame, Gem } from 'lucide-react';
import { Card, ProgressBar } from '../../shared/ui';
import { gamificationApi } from '../../features/gamification/gamificationApi';
import { useI18n } from '../../shared/i18n/i18n';

const icons = [Flame, Brain, Gem, Award];

export function AchievementsPage() {
  const { t } = useI18n();
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

  return <div className="mx-auto max-w-6xl animate-rise">
    <div><p className="eyebrow">{t('achievements.eyebrow')}</p><h1 className="page-title mt-3">{t('achievements.title')}</h1><p className="mt-3 text-stone-600">{t('achievements.description')}</p></div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}
    <Card className="mt-8 overflow-hidden bg-ink p-7 text-white sm:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-lime">{t('achievements.streak', { count: streak?.current || 0 })}</p><h2 className="mt-2 font-display text-3xl font-semibold">{t('achievements.earnedSummary', { earned, total: items.length })}</h2></div><div className="diagnostic-result-mark grid h-24 w-24 shrink-0 place-items-center rounded-full border-[10px] border-lime/30 bg-lime text-center font-display text-2xl font-semibold text-ink">{percent}%</div></div><ProgressBar className="mt-7" value={percent} /></Card>
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => { const Icon = icons[index % icons.length]; return <Card key={item.id} style={{ '--badge-delay': `${index * 90}ms` }} className={`achievement-card p-6 ${!item.earned ? 'opacity-55' : ''}`}><span className={`achievement-icon ${item.earned ? 'achievement-icon--earned bg-lime text-ink' : 'bg-stone-200 text-stone-500'} grid h-14 w-14 place-items-center rounded-2xl`}><Icon className="h-7 w-7" /></span><h2 className="mt-6 text-xl font-extrabold">{t(`achievements.items.${item.id}.title`)}</h2><p className="mt-2 text-sm text-stone-500">{t(`achievements.items.${item.id}.description`)}</p><ProgressBar className="mt-4" value={Math.round(item.progress / item.target * 100)} /><p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-lavender-600">{item.earned ? t('achievements.earned') : `${item.progress}/${item.target}`}</p></Card>; })}</div>
  </div>;
}
