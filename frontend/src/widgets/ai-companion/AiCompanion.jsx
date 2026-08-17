import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../shared/i18n/i18n';
import mascot from '../../assets/images/sana-mascot.png';

export function AiCompanion({ compact = false }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const submit = (event) => { event.preventDefault(); if (!message.trim()) return; setReply(t('aiCompanion.reply')); setMessage(''); };

  if (compact) return <img src={mascot} alt={t('aiCompanion.alt')} className="mascot-image h-28 w-28 rounded-full object-cover object-center" width="112" height="112" />;
  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-30 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-ink px-4 font-bold text-white shadow-soft transition hover:-translate-y-1 lg:bottom-6 lg:right-6" aria-label={t('aiCompanion.open')}><Sparkles className="h-5 w-5 text-lime" /><span className="hidden sm:inline">{t('aiCompanion.ask')}</span></button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/45 p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="sana-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="max-h-[92dvh] w-full max-w-md animate-rise overflow-y-auto rounded-t-4xl bg-paper shadow-2xl sm:rounded-4xl"><div className="sticky top-0 flex items-center gap-3 bg-lavender-100 p-5"><img src={mascot} alt="" className="h-16 w-16 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p id="sana-title" className="font-display font-semibold">SANA</p><p className="break-words text-sm text-stone-600">{t('aiCompanion.subtitle')}</p></div><button onClick={() => setOpen(false)} className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-paper" aria-label={t('aiCompanion.close')}><X /></button></div><div className="min-h-64 space-y-4 p-5"><div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-stone-100 p-4 text-sm">{t('aiCompanion.greeting')}</div>{reply && <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-lavender-600 p-4 text-sm text-white">{reply}</div>}</div><form onSubmit={submit} className="sticky bottom-0 flex gap-2 border-t border-stone-200 bg-paper p-4"><label className="sr-only" htmlFor="sana-message">{t('aiCompanion.question')}</label><input id="sana-message" value={message} onChange={(event) => setMessage(event.target.value)} className="field-control min-w-0" placeholder={t('aiCompanion.placeholder')} /><button type="submit" disabled={!message.trim()} className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-lavender-600 text-white disabled:opacity-50" aria-label={t('aiCompanion.send')}><Send className="h-5 w-5" /></button></form></div></div>}
  </>;
}
