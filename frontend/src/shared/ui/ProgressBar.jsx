import { cn } from '../lib/cn';
import { useI18n } from '../i18n/i18n';

export function ProgressBar({ value, label, className, tone = 'violet' }) {
  const { t } = useI18n();
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const color = tone === 'mint' ? 'bg-mint-500' : tone === 'coral' ? 'bg-coral' : 'bg-lavender-500';
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold">
          <span>{label}</span>
          <span className="tabular-nums text-stone-600">{safeValue}%</span>
        </div>
      )}
      <div className="h-3 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label={label || t('ui.progress')} aria-valuemin="0" aria-valuemax="100" aria-valuenow={safeValue}>
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
