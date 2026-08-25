import { AlertTriangle } from 'lucide-react';
import { Button } from '../../shared/ui';
import { cn } from '../../shared/lib/cn';
import { useI18n } from '../../shared/i18n/i18n';

export function ErrorState({ title, description, onRetry, retryLabel, className }) {
  const { t } = useI18n();
  return <div className={cn('state-error state-panel flex items-start gap-4', className)} role="alert"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger-100"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="font-extrabold">{title}</h2>{description && <p className="mt-1 break-words text-sm leading-6">{description}</p>}{onRetry && <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>{retryLabel || t('common.retry')}</Button>}</div></div>;
}
