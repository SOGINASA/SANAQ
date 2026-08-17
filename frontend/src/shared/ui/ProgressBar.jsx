import { cn } from '../lib/cn';

export function ProgressBar({ value, label, className, tone = 'violet' }) {
  const color = tone === 'mint' ? 'bg-mint-500' : tone === 'coral' ? 'bg-coral' : 'bg-lavender-500';
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold">
          <span>{label}</span>
          <span className="tabular-nums text-stone-600">{value}%</span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label={label || 'Прогресс'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
