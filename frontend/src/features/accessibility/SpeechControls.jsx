import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { useI18n } from '../../shared/i18n/i18n';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export function SpeechControls({ text, className = '', label }) {
  const { t } = useI18n();
  const { supported, status, speak, stop, togglePause } = useSpeechSynthesis();
  const accessibleLabel = label || t('speech.read');
  if (!supported) return null;
  return <div className={`flex max-w-full flex-wrap items-center gap-2 ${className}`} role="group" aria-label={accessibleLabel}>
    <button type="button" onClick={() => speak(text)} className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-xl bg-stone-100 px-4 text-sm font-bold text-ink transition hover:bg-lavender-100 hover:text-lavender-700" aria-label={accessibleLabel}><Volume2 className="h-4 w-4 shrink-0 text-lavender-700" /><span className="break-words">{status === 'idle' ? accessibleLabel : t('speech.restart')}</span></button>
    {status !== 'idle' && <><button type="button" onClick={togglePause} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl bg-stone-100 text-ink transition hover:bg-lavender-100 hover:text-lavender-700" aria-label={status === 'paused' ? t('speech.resume') : t('speech.pause')}>{status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button type="button" onClick={stop} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl bg-stone-100 text-ink transition hover:bg-red-50 hover:text-red-700" aria-label={t('speech.stop')}><Square className="h-4 w-4" /></button></>}
    <span className="sr-only" aria-live="polite">{status === 'speaking' ? t('speech.speaking') : status === 'paused' ? t('speech.paused') : t('speech.finished')}</span>
  </div>;
}
