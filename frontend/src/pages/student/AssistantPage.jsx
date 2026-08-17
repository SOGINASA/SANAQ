import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Lightbulb,
  MessageCircleQuestion,
  Plus,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';
import { aiTutorApi } from '../../features/ai-tutor/aiTutorApi';
import { catalogApi } from '../../shared/api/catalogApi';

const starterPrompts = [
  { icon: Lightbulb, title: 'Объясни тему проще', text: 'Разность квадратов' },
  { icon: BookOpen, title: 'Помоги с заданием', text: 'Разберём по шагам' },
  { icon: RotateCcw, title: 'Повтори со мной', text: 'Формулы сокращённого умножения' },
  { icon: MessageCircleQuestion, title: 'Проверь мои знания', text: 'Задай три коротких вопроса' },
];

const followUpPrompts = ['Объясни ещё проще', 'Покажи другой пример', 'Дай похожее задание'];

export function AssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [toast, setToast] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileResponse, conversationsResponse] = await Promise.all([
          catalogApi.studentProfile(), aiTutorApi.conversations(),
        ]);
        const subjectId = profileResponse.data.profile?.subject_ids?.[0];
        if (!subjectId) return;
        const topicsResponse = await catalogApi.topics(subjectId);
        if (!active) return;
        const serverTopics = topicsResponse.data.items || [];
        setTopics(serverTopics);
        const latest = conversationsResponse.data.items?.[0];
        if (latest) {
          const history = await aiTutorApi.conversation(latest.id);
          if (!active) return;
          setConversationId(latest.id);
          setTopic(latest.topic || serverTopics[0]?.name || '');
          setMessages((history.data.messages || []).map((item) => ({ ...item, text: item.content })));
        } else {
          setTopic(serverTopics[0]?.name || '');
        }
      } catch (requestError) {
        if (active) setToast(requestError.message);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!messages.length && !thinking) return;
    window.requestAnimationFrame(() => bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }));
  }, [messages, thinking]);

  const resetTextarea = () => {
    if (textareaRef.current) textareaRef.current.style.height = '44px';
  };

  const sendMessage = async (text = message) => {
    const cleanMessage = text.trim();
    if (!cleanMessage || thinking) return;

    setMessage('');
    setThinking(true);
    resetTextarea();
    try {
      let activeConversationId = conversationId;
      let initialMessages = [];
      if (!activeConversationId) {
        const created = await aiTutorApi.createConversation({ topic });
        activeConversationId = created.data.conversation.id;
        setConversationId(activeConversationId);
        initialMessages = created.data.messages.map((item) => ({ ...item, text: item.content }));
      }
      setMessages((current) => [...current, ...initialMessages, { id: `pending-${Date.now()}`, role: 'user', text: cleanMessage }]);
      const response = await aiTutorApi.message(activeConversationId, { content: cleanMessage });
      setMessages((current) => [
        ...current.filter((item) => !String(item.id).startsWith('pending-')),
        { ...response.data.user_message, text: response.data.user_message.content },
        { ...response.data.assistant_message, text: response.data.assistant_message.content },
      ]);
    } catch (requestError) {
      setToast(requestError.message);
    } finally {
      setThinking(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (event) => {
    setMessage(event.target.value);
    event.target.style.height = '44px';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
  };

  const newChat = () => {
    setMessages([]);
    setConversationId(null);
    setThinking(false);
    setMessage('');
    resetTextarea();
  };

  const reportMessage = async (messageId) => {
    try {
      await aiTutorApi.report(messageId, { reason: 'Ответ не помог или содержит неточность' });
      setToast('Жалоба сохранена и отправлена на проверку');
    } catch (requestError) {
      setToast(requestError.message);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-paper">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-stone-200 px-3 sm:px-5" aria-label="Панель чата">
        <button onClick={() => navigate('/student/dashboard')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100 lg:hidden" aria-label="Вернуться в кабинет"><ArrowLeft className="h-5 w-5" /></button>
        <img src={mascot} alt="" className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-sm font-semibold sm:text-base">SANA</h1>
          <p className="truncate text-xs text-stone-500">Учебный ассистент · {topic}</p>
        </div>
        <button onClick={() => setContextOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100 sm:hidden" aria-label="Выбрать тему разговора"><BookOpen className="h-5 w-5" /></button>
        <button onClick={() => setContextOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 sm:flex"><BookOpen className="h-4 w-4 text-lavender-600" /><span className="max-w-48 truncate">{topic}</span><ChevronDown className="h-4 w-4" /></button>
        <button onClick={newChat} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100" aria-label="Новый чат"><Plus className="h-5 w-5" /></button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label="Диалог с SANA" aria-live="polite">
        {messages.length === 0 && !thinking ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-100 text-lavender-700"><Sparkles className="h-7 w-7" /></span>
              <h2 className="mt-6 font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Чем помочь с учёбой?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500 sm:text-base">Спроси своими словами или выбери один из вариантов. SANA объяснит ход решения, но не будет делать работу за тебя.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {starterPrompts.map(({ icon: Icon, title, text }) => (
                <button key={title} onClick={() => sendMessage(`${title}: ${text}`)} className="flex min-h-20 items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-4 text-left transition hover:border-lavender-300 hover:bg-lavender-50">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Icon className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs text-stone-500">{text}</span></span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 sm:py-10">
            <div className="mb-8 flex items-center justify-center gap-2 text-xs font-bold text-stone-500"><BookOpen className="h-4 w-4 text-lavender-600" /> SANA использует материалы темы «{topic}»</div>
            <div className="space-y-7">
              {messages.map((item) => (
                <article key={item.id} className={`flex gap-3 sm:gap-4 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {item.role === 'assistant' && <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span>}
                  <div className={item.role === 'user' ? 'max-w-[88%] rounded-3xl rounded-br-md bg-ink px-5 py-3 text-sm leading-7 text-white sm:max-w-[75%]' : 'min-w-0 max-w-[calc(100%-52px)] text-sm leading-7 text-stone-700 sm:text-base'}>
                    <p>{item.text}</p>
                    {item.hint && <div className="mt-4 rounded-2xl bg-lime/25 p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#52670A]"><Lightbulb className="h-4 w-4" /> Твой ход</p><p className="mt-2 text-sm font-semibold leading-6 text-ink">{item.hint}</p></div>}
                    {item.role === 'assistant' && <div className="mt-3 flex gap-1 text-stone-400"><button onClick={() => { navigator.clipboard?.writeText(`${item.text} ${item.hint || ''}`); setToast('Ответ скопирован'); }} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Скопировать ответ"><Copy className="h-4 w-4" /></button><button onClick={() => setToast('Спасибо за оценку ответа')} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Полезный ответ"><ThumbsUp className="h-4 w-4" /></button><button onClick={() => reportMessage(item.id)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Ответ не помог"><ThumbsDown className="h-4 w-4" /></button></div>}
                  </div>
                </article>
              ))}
              {thinking && <div className="flex items-center gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span><div className="flex items-center gap-1 rounded-2xl bg-stone-100 px-4 py-3" aria-label="SANA формулирует ответ"><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400" /><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400 [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400 [animation-delay:300ms]" /></div></div>}
            </div>
            <div ref={bottomRef} className="h-2" />
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-stone-200 bg-paper px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length > 0 && !thinking && <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{followUpPrompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)} className="min-h-10 shrink-0 rounded-full border border-stone-200 px-4 text-xs font-bold text-stone-600 transition hover:border-lavender-300 hover:bg-lavender-50">{prompt}</button>)}</div>}
          <form onSubmit={handleSubmit} className="flex items-end gap-1 rounded-3xl border border-stone-300 bg-white p-2 shadow-sm transition focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-100">
            <label className="sr-only" htmlFor="assistant-message">Сообщение для SANA</label>
            <textarea ref={textareaRef} id="assistant-message" rows="1" value={message} onChange={handleInput} onKeyDown={handleKeyDown} placeholder="Сообщение для SANA" className="min-h-11 max-h-36 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-base leading-6 outline-none placeholder:text-stone-400" />
            <button type="submit" disabled={!message.trim() || thinking} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white transition hover:bg-lavender-700 disabled:bg-stone-200 disabled:text-stone-400" aria-label="Отправить сообщение"><ArrowUp className="h-5 w-5" /></button>
          </form>
          <p className="mt-2 text-center text-[11px] leading-4 text-stone-400">SANA может ошибаться. Проверяй важные факты и решения.</p>
        </div>
      </footer>

      <Dialog open={contextOpen} onClose={() => setContextOpen(false)} title="Контекст разговора" description="SANA будет опираться на выбранную тему." footer={<><Button variant="ghost" onClick={() => setContextOpen(false)}>Отмена</Button><Button onClick={() => { setContextOpen(false); setToast('Контекст разговора обновлён'); }}><Check className="h-5 w-5" /> Применить</Button></>}>
        <div className="space-y-5"><div><label className="field-label" htmlFor="assistant-topic">Тема из учебного каталога</label><select id="assistant-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="field-control">{topics.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div><p className="rounded-2xl bg-lavender-50 p-4 text-sm font-semibold">Контекст прогресса и список тем загружены с сервера.</p></div>
      </Dialog>
      <StatusToast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
