import { useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import mascot from '../../assets/images/sana-mascot.png';

export function AiCompanion({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setReply('Давай не спешить к ответу. Какую формулу разности квадратов ты помнишь? Попробуй записать её — я подхвачу следующий шаг.');
    setMessage('');
  };

  if (compact) {
    return <img src={mascot} alt="SANA — AI-спутник обучения" className="mascot-image h-28 w-28 rounded-full object-cover object-center" width="112" height="112" />;
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-30 flex min-h-14 items-center gap-3 rounded-2xl bg-ink px-4 font-bold text-white shadow-soft transition hover:-translate-y-1 lg:bottom-6 lg:right-6" aria-label="Открыть помощника SANA">
        <Sparkles className="h-5 w-5 text-lime" /> <span className="hidden sm:inline">Спросить SANA</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/45 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="sana-title">
          <div className="w-full max-w-md animate-rise overflow-hidden rounded-4xl bg-paper shadow-2xl">
            <div className="flex items-center gap-3 bg-lavender-100 p-5">
              <img src={mascot} alt="" className="h-16 w-16 rounded-2xl object-cover" />
              <div className="flex-1"><p id="sana-title" className="font-display font-semibold">SANA</p><p className="text-sm text-stone-600">Помогу разобраться, не решая за тебя</p></div>
              <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl bg-paper" aria-label="Закрыть чат"><X /></button>
            </div>
            <div className="min-h-64 space-y-4 p-5">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-stone-100 p-4 text-sm">Привет! Что сейчас кажется самым непонятным?</div>
              {reply && <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-lavender-600 p-4 text-sm text-white">{reply}</div>}
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-stone-200 p-4">
              <label className="sr-only" htmlFor="sana-message">Вопрос для SANA</label>
              <input id="sana-message" value={message} onChange={(e) => setMessage(e.target.value)} className="field-control" placeholder="Напиши вопрос по теме…" />
              <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white" aria-label="Отправить"><Send className="h-5 w-5" /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
