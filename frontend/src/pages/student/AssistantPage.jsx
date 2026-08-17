import { useState } from 'react';
import {
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Lightbulb,
  MessageSquareText,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    text: 'Привет, Айару! Я вижу, что сейчас ты изучаешь разложение на множители. Что именно вызывает трудность?',
  },
  {
    id: 2,
    role: 'user',
    text: 'Не понимаю, как быстро увидеть разность квадратов.',
  },
  {
    id: 3,
    role: 'assistant',
    text: 'Посмотри на два признака: между выражениями стоит минус, а каждое из них можно представить как квадрат. Например, x² — это квадрат x, а 25 — квадрат 5.',
    hint: 'Попробуй сама: какие два «квадрата» спрятаны в выражении 4x² − 9?',
  },
];

const suggestions = [
  'Объясни ещё проще',
  'Покажи на примере из жизни',
  'Дай похожее задание',
];

const history = [
  ['Сегодня', 'Разность квадратов', '12 мин'],
  ['Вчера', 'Линейные уравнения', '8 мин'],
  ['14 августа', 'Графики функций', '16 мин'],
];

export function AssistantPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(initialMessages);

  const sendMessage = (text = message) => {
    const cleanMessage = text.trim();
    if (!cleanMessage) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text: cleanMessage },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'Хороший вопрос. Сначала найди, что возводили в квадрат слева и справа. Затем используй шаблон a² − b² = (a − b)(a + b). Я не буду спешить с ответом — напиши, чему равны a и b.',
      },
    ]);
    setMessage('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="mx-auto max-w-[1500px] animate-rise">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow">Персональный помощник</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Разберёмся вместе с SANA</h1>
          <p className="mt-2 max-w-2xl text-stone-600">Задавай вопросы своими словами. SANA объяснит ход мысли и поможет дойти до ответа самостоятельно.</p>
        </div>
        <button className="inline-flex min-h-12 items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-paper px-4 text-left font-bold shadow-sm xl:min-w-[300px]">
          <span><span className="block text-xs uppercase tracking-wider text-stone-400">Контекст урока</span><span className="mt-0.5 block">Математика · 9 класс</span></span>
          <ChevronDown className="h-5 w-5 text-stone-400" />
        </button>
      </div>

      <div className="grid min-h-[690px] overflow-hidden rounded-4xl border border-stone-200 bg-paper shadow-soft xl:grid-cols-[290px_minmax(0,1fr)_270px]">
        <aside className="hidden border-r border-stone-200 p-5 xl:block">
          <button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 font-bold text-white transition hover:bg-stone-800">
            <Plus className="h-5 w-5" /> Новый диалог
          </button>
          <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-[0.14em] text-stone-400">История</p>
          <div className="space-y-2">
            {history.map(([date, title, duration], index) => (
              <button key={title} className={`w-full rounded-2xl p-3 text-left transition hover:bg-stone-100 ${index === 0 ? 'bg-lavender-100' : ''}`}>
                <span className="block text-xs font-bold text-stone-400">{date}</span>
                <span className="mt-1 block font-bold">{title}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500"><Clock3 className="h-3.5 w-3.5" /> {duration}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col bg-[#FBFAF7]" aria-label="Диалог с SANA">
          <div className="flex items-center gap-3 border-b border-stone-200 bg-paper px-4 py-3 sm:px-6">
            <img src={mascot} alt="" className="h-12 w-12 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold">SANA</p>
              <p className="truncate text-xs text-stone-500">В контексте темы «Разность квадратов»</p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1.5 text-xs font-bold text-mint-700 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-mint-500" /> На связи</span>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7" aria-live="polite">
            <div className="mx-auto flex max-w-xl items-center justify-center gap-2 rounded-full bg-lavender-100 px-4 py-2 text-center text-xs font-bold text-lavender-700">
              <BookOpen className="h-4 w-4 shrink-0" /> SANA использует материалы текущего урока
            </div>
            {messages.map((item) => (
              <div key={item.id} className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {item.role === 'assistant' && <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span>}
                <div className={`max-w-[86%] rounded-3xl px-5 py-4 text-sm leading-7 sm:max-w-[75%] ${item.role === 'user' ? 'rounded-tr-md bg-ink text-white' : 'rounded-tl-md border border-stone-200 bg-paper text-stone-700'}`}>
                  <p>{item.text}</p>
                  {item.hint && <div className="mt-4 rounded-2xl bg-lime/25 p-4 font-semibold text-ink"><span className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#52670A]"><Lightbulb className="h-4 w-4" /> Твой ход</span>{item.hint}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 bg-paper p-4 sm:p-5">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(suggestion)} className="min-h-10 shrink-0 rounded-full border border-stone-200 bg-paper px-4 text-xs font-bold transition hover:border-lavender-300 hover:bg-lavender-50">{suggestion}</button>)}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-3xl border border-stone-300 bg-white p-2 focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-100">
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-500 hover:bg-stone-100" aria-label="Прикрепить файл"><Paperclip className="h-5 w-5" /></button>
              <label className="sr-only" htmlFor="assistant-message">Сообщение для SANA</label>
              <textarea id="assistant-message" rows="1" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Напиши, что осталось непонятным…" className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-stone-400" />
              <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white transition hover:bg-lavender-700" aria-label="Отправить сообщение"><ArrowUp className="h-5 w-5" /></button>
            </form>
            <p className="mt-2 text-center text-[11px] text-stone-400">SANA может ошибаться. Проверяй важные факты и решения.</p>
          </div>
        </section>

        <aside className="hidden border-l border-stone-200 p-5 xl:block">
          <p className="eyebrow">Текущий фокус</p>
          <h2 className="mt-2 text-lg font-extrabold">Разность квадратов</h2>
          <div className="mt-5 space-y-3">
            <Card className="p-4 shadow-none"><CheckCircle2 className="h-5 w-5 text-mint-700" /><p className="mt-3 text-sm font-bold">Распознать формулу</p><p className="mt-1 text-xs leading-5 text-stone-500">Уверенность 72%</p></Card>
            <Card className="border-lavender-300 bg-lavender-50 p-4 shadow-none"><MessageSquareText className="h-5 w-5 text-lavender-600" /><p className="mt-3 text-sm font-bold">Раскрыть скобки</p><p className="mt-1 text-xs leading-5 text-stone-500">Разбираем сейчас</p></Card>
          </div>
          <div className="mt-6 rounded-3xl bg-mint-100 p-4">
            <ShieldCheck className="h-5 w-5 text-mint-700" />
            <p className="mt-3 text-sm font-bold">Безопасный режим</p>
            <p className="mt-1 text-xs leading-5 text-stone-600">Ассистент не выдаёт готовый ответ до твоей попытки и объясняет источник подсказки.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
