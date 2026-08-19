import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useI18n } from '../../shared/i18n/i18n';
import { Dialog } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';

export function AiCompanion({ compact = false }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setReply(t('aiCompanion.reply'));
    setMessage('');
  };

  if (compact) return <img src={mascot} alt={t('aiCompanion.alt')} className="mascot-image h-28 w-28 rounded-full object-cover object-center" width="112" height="112" />;

  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-30 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-ink px-4 font-bold text-white shadow-soft transition hover:-translate-y-1 lg:bottom-6 lg:right-6" aria-label={t('aiCompanion.open')}><Sparkles className="h-5 w-5 text-lime" aria-hidden="true" /><span className="hidden sm:inline">{t('aiCompanion.ask')}</span></button>
    <Dialog open={open} onClose={() => setOpen(false)} title="SANA" description={t('aiCompanion.subtitle')} size="sm" footer={<form onSubmit={submit} className="flex w-full min-w-0 gap-2"><label className="sr-only" htmlFor="sana-message">{t('aiCompanion.question')}</label><input id="sana-message" value={message} onChange={(event) => setMessage(event.target.value)} className="field-control min-w-0" placeholder={t('aiCompanion.placeholder')} /><button type="submit" disabled={!message.trim()} className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-lavender-600 text-white disabled:opacity-50" aria-label={t('aiCompanion.send')}><Send className="h-5 w-5" aria-hidden="true" /></button></form>}>
      <div className="flex items-center gap-3 rounded-3xl bg-lavender-100 p-4"><img src={mascot} alt="" className="h-16 w-16 rounded-2xl object-cover" /><p className="break-words text-sm font-semibold text-stone-600">{t('aiCompanion.greeting')}</p></div>
      <div className="min-h-36 space-y-4 pt-5" aria-live="polite">{reply && <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-lavender-600 p-4 text-sm text-white">{reply}</div>}</div>
    </Dialog>
  </>;
}
