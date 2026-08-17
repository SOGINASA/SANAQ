import { ArrowDown, ArrowRight, ArrowUp, Sparkles } from 'lucide-react';
import { useI18n } from '../../shared/i18n/i18n';

const clamp = (value) => Math.max(1, Math.min(5, Number(value) || 1));

export function DifficultyAdaptation({ current, adaptation, compact = false }) {
  const { t } = useI18n();
  const currentLevel = clamp(adaptation?.current_difficulty ?? current);
  const nextLevel = adaptation ? clamp(adaptation.recommended_difficulty) : null;
  const direction = adaptation?.direction;
  const DirectionIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : ArrowRight;
  const directionTone = direction === 'up' ? 'bg-mint-100 text-mint-700' : direction === 'down' ? 'status-danger' : 'bg-lavender-100 text-lavender-700';

  return <section className={`rounded-3xl border border-stone-200 bg-paper ${compact ? 'p-4' : 'p-5 sm:p-6'}`} aria-label={t('task.adaptiveDifficulty')}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="flex items-center gap-2 text-sm font-extrabold text-lavender-700"><Sparkles className="h-4 w-4" /> {t('task.adaptiveDifficulty')}</p><p className="mt-1 text-sm text-stone-500">{adaptation ? t('task.recalculated') : t('task.currentReason')}</p></div>
      {adaptation && <span className={`inline-flex min-h-10 self-start items-center gap-2 rounded-full px-3 text-sm font-extrabold sm:self-auto ${directionTone}`}><DirectionIcon className="h-4 w-4" /> {direction === 'up' ? t('task.harder') : direction === 'down' ? t('task.easier') : t('task.same')}</span>}
    </div>
    <div className="mt-5 flex items-center gap-2" aria-label={`${t('task.level')} ${currentLevel}`}>
      {[1, 2, 3, 4, 5].map((level) => {
        const active = level <= currentLevel;
        const recommended = nextLevel === level;
        return <div key={level} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={`h-3 w-full rounded-full transition-colors ${active ? 'bg-lavender-600' : 'bg-stone-200'} ${recommended ? 'ring-4 ring-lime/60' : ''}`} /><span className={`text-xs font-extrabold ${recommended ? 'text-ink' : active ? 'text-lavender-700' : 'text-stone-400'}`}>{level}</span></div>;
      })}
    </div>
    <div className="mt-3 flex justify-between gap-4 text-xs font-semibold text-stone-500"><span>{t('task.foundation')}</span><span>{t('task.challenge')}</span></div>
    {adaptation && <div className="mt-5 rounded-2xl bg-stone-100 p-4"><div className="flex flex-wrap items-center gap-2 text-sm font-extrabold"><span>{t('task.was')} {currentLevel}</span><ArrowRight className="h-4 w-4 text-stone-400" /><span>{t('task.next')} {nextLevel}</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{adaptation.reason}</p></div>}
  </section>;
}
