import { CheckCircle2, X } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

export function StatusToast({ message, onClose }) {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div className="status-toast fixed bottom-24 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink p-4 text-sm font-bold text-white shadow-2xl lg:bottom-6" role="status" aria-live="polite">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-lime" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-stone-300 hover:bg-white/10 hover:text-white" aria-label={t('ui.dismiss')}><X className="h-4 w-4" /></button>
    </div>
  );
}
