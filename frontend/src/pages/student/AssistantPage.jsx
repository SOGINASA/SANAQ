import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  History,
  Lightbulb,
  MessageCircleQuestion,
  Plus,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import { assistantApi } from '../../shared/api/assistantApi';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { useAuthStore } from '../../features/auth/authStore';
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
  const authStatus = useAuthStore((state) => state.status);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [subject, setSubject] = useState('Математика');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [grade, setGrade] = useState(9);
  const [toast, setToast] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const requestControllerRef = useRef(null);

  const refreshHistory = async () => {
    if (!tokenStorage.getAccessToken()) return;
    setHistoryLoading(true);
    try {
      const result = await assistantApi.conversations();
      setConversations(result.data.items || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!tokenStorage.getAccessToken()) return;
      setHistoryLoading(true);
      try {
        const [profileResponse, subjectsResponse, conversationsResponse] = await Promise.all([
          catalogApi.studentProfile(), catalogApi.subjects(), assistantApi.conversations(),
        ]);
        const profile = profileResponse.data.profile;
        const subjectId = profile?.subject_ids?.[0];
        const selectedSubject = subjectsResponse.data.items?.find((item) => item.id === subjectId);
        const topicsResponse = subjectId ? await catalogApi.topics(subjectId) : null;
        if (!active) return;
        const serverTopics = topicsResponse?.data.items || [];
        const serverConversations = conversationsResponse.data.items || [];
        setGrade(profile?.grade || 9);
        setSubject(selectedSubject?.name || 'Математика');
        setTopics(serverTopics);
        setConversations(serverConversations);
        const latest = serverConversations[0];
        if (latest) {
          const history = await assistantApi.conversation(latest.id);
          if (!active) return;
          setConversationId(latest.id);
          setSubject(history.data.subject || selectedSubject?.name || 'Математика');
          setTopic(history.data.topic || serverTopics[0]?.name || 'Общий вопрос');
          setMessages(history.data.messages || []);
        } else {
          setTopic(serverTopics[0]?.name || 'Общий вопрос');
        }
      } catch (error) {
        if (active) setToast(error.message);
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    load();
    return () => {
      active = false;
      requestControllerRef.current?.abort();
    };
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

    if (authStatus !== 'authenticated' || !tokenStorage.getAccessToken()) {
      setToast('Сначала войди в аккаунт ученика — после входа SANA сразу начнёт отвечать.');
      return;
    }

    const userMessage = { id: `local-user-${Date.now()}`, role: 'user', content: cleanMessage };
    const assistantId = `stream-${Date.now()}`;
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setThinking(true);
    resetTextarea();

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const created = await assistantApi.createConversation({ subject, topic, grade });
        activeConversationId = created.data.id;
        setConversationId(activeConversationId);
      }
      requestControllerRef.current = new AbortController();
      await assistantApi.streamMessage(activeConversationId, cleanMessage, {
        signal: requestControllerRef.current.signal,
        onToken: (chunk) => {
          setMessages((current) => {
            const hasAssistantMessage = current.some((item) => item.id === assistantId);
            if (!hasAssistantMessage) {
              return [...current, { id: assistantId, role: 'assistant', content: chunk }];
            }
            return current.map((item) => (
              item.id === assistantId ? { ...item, content: `${item.content}${chunk}` } : item
            ));
          });
        },
        onDone: ({ message: savedMessage }) => {
          setMessages((current) => {
            if (!current.some((item) => item.id === assistantId)) return [...current, savedMessage];
            return current.map((item) => (
              item.id === assistantId ? { ...savedMessage, content: item.content || savedMessage.content } : item
            ));
          });
        },
      });
      await refreshHistory();
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((current) => current.filter((item) => item.id !== assistantId));
        setToast(error.message || 'Не удалось получить ответ SANA');
      }
    } finally {
      requestControllerRef.current = null;
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
    requestControllerRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setThinking(false);
    setMessage('');
    setHistoryOpen(false);
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

  const openConversation = async (id) => {
    if (thinking) return;
    setHistoryLoading(true);
    try {
      const result = await assistantApi.conversation(id);
      setConversationId(id);
      setMessages(result.data.messages || []);
      setSubject(result.data.subject || 'Математика');
      setTopic(result.data.topic || 'Общий вопрос');
      setHistoryOpen(false);
    } catch (error) {
      setToast(error.message);
    } finally {
      setHistoryLoading(false);
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
        <button onClick={() => setHistoryOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100" aria-label="История чатов"><History className="h-5 w-5" /></button>
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
            {authStatus !== 'authenticated' && (
              <div className="mx-auto mt-6 w-full max-w-xl rounded-3xl border border-lavender-200 bg-lavender-50 p-5 text-center" role="status">
                <p className="font-extrabold text-ink">{authStatus === 'loading' ? 'Проверяем вход…' : 'Войди, чтобы SANA могла ответить'}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">Диалоги сохраняются в личной истории ученика, поэтому для настоящего чата нужен аккаунт.</p>
                {authStatus !== 'loading' && <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => navigate('/register')}>Создать аккаунт</Button><Button onClick={() => navigate('/login')}>Войти</Button></div>}
              </div>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {starterPrompts.map(({ icon: Icon, title, text }) => (
                <button key={title} disabled={authStatus !== 'authenticated'} onClick={() => sendMessage(`${title}: ${text}`)} className="flex min-h-20 items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-4 text-left transition hover:border-lavender-300 hover:bg-lavender-50 disabled:cursor-not-allowed disabled:opacity-50">
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
                    <p className="whitespace-pre-wrap">{item.content ?? item.text}</p>
                    {item.hint && <div className="mt-4 rounded-2xl bg-lime/25 p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#52670A]"><Lightbulb className="h-4 w-4" /> Твой ход</p><p className="mt-2 text-sm font-semibold leading-6 text-ink">{item.hint}</p></div>}
                    {item.role === 'assistant' && <div className="mt-3 flex gap-1 text-stone-400"><button onClick={() => { navigator.clipboard?.writeText(`${item.content ?? item.text ?? ''} ${item.hint || ''}`.trim()); setToast('Ответ скопирован'); }} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Скопировать ответ"><Copy className="h-4 w-4" /></button><button onClick={() => setToast('Спасибо за оценку ответа')} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Полезный ответ"><ThumbsUp className="h-4 w-4" /></button><button onClick={() => reportMessage(item.id)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100 hover:text-ink" aria-label="Ответ не помог"><ThumbsDown className="h-4 w-4" /></button></div>}
                  </div>
                </article>
              ))}
              {thinking && messages[messages.length - 1]?.role !== 'assistant' && <div className="flex items-center gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span><div className="flex items-center gap-1 rounded-2xl bg-stone-100 px-4 py-3" aria-label="SANA формулирует ответ"><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400" /><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400 [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full bg-stone-400 [animation-delay:300ms]" /></div></div>}
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
            <button type="submit" disabled={!message.trim() || thinking || authStatus !== 'authenticated'} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white transition hover:bg-lavender-700 disabled:bg-stone-200 disabled:text-stone-400" aria-label="Отправить сообщение"><ArrowUp className="h-5 w-5" /></button>
          </form>
          <p className="mt-2 text-center text-[11px] leading-4 text-stone-400">SANA может ошибаться. Проверяй важные факты и решения.</p>
        </div>
      </footer>

      {historyOpen && <div className="fixed inset-0 z-50 bg-ink/25" onClick={() => setHistoryOpen(false)} aria-hidden="true" />}
      <aside className={`fixed inset-y-0 left-0 z-[60] flex w-[min(340px,88vw)] flex-col border-r border-stone-200 bg-paper shadow-2xl transition-transform duration-200 lg:left-72 ${historyOpen ? 'translate-x-0' : '-translate-x-[calc(100%+18rem)]'}`} aria-label="История чатов" aria-hidden={!historyOpen}>
        <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4">
          <div><p className="font-display font-semibold">История</p><p className="text-xs text-stone-500">Твои диалоги с SANA</p></div>
          <button onClick={() => setHistoryOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-stone-100" aria-label="Закрыть историю"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-3"><Button onClick={newChat} className="w-full"><Plus className="h-4 w-4" /> Новый чат</Button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {historyLoading && <p className="p-4 text-center text-sm text-stone-500">Загружаем диалоги…</p>}
          {!historyLoading && conversations.length === 0 && <p className="rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-stone-500">Здесь появятся сохранённые разговоры после первого сообщения.</p>}
          <div className="space-y-1">
            {conversations.map((conversation) => <button key={conversation.id} onClick={() => openConversation(conversation.id)} className={`w-full rounded-2xl px-4 py-3 text-left transition hover:bg-stone-100 ${conversation.id === conversationId ? 'bg-lavender-100' : ''}`}><span className="block truncate text-sm font-bold">{conversation.title}</span><span className="mt-1 block truncate text-xs text-stone-500">{conversation.topic}</span></button>)}
          </div>
        </div>
      </aside>

      <Dialog open={contextOpen} onClose={() => setContextOpen(false)} title="Контекст разговора" description="SANA будет опираться на выбранную тему." footer={<><Button variant="ghost" onClick={() => setContextOpen(false)}>Отмена</Button><Button onClick={() => { newChat(); setContextOpen(false); setToast('Контекст обновлён — новый диалог будет сохранён на сервере'); }}><Check className="h-5 w-5" /> Применить</Button></>}>
        <div className="space-y-5"><div><label className="field-label" htmlFor="assistant-topic">Тема из учебного каталога</label><select id="assistant-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="field-control">{topics.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div><p className="rounded-2xl bg-lavender-50 p-4 text-sm font-semibold">Контекст прогресса и список тем загружены с сервера.</p></div>
      </Dialog>
      <StatusToast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
