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
import { useI18n } from '../../shared/i18n/i18n';

const starterPrompts = [
  { icon: Lightbulb, key: 'explain' },
  { icon: BookOpen, key: 'task' },
  { icon: RotateCcw, key: 'repeat' },
  { icon: MessageCircleQuestion, key: 'quiz' },
];

const followUpPrompts = ['simpler', 'anotherExample', 'similarTask'];

export function AssistantPage() {
  const { t } = useI18n();
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
  const [subject, setSubject] = useState(() => t('assistantPage.defaults.subject'));
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]);
  const [grade, setGrade] = useState(9);
  const [toast, setToast] = useState('');
  const scrollAreaRef = useRef(null);
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
        setSubject(selectedSubject?.name || t('assistantPage.defaults.subject'));
        setTopics(serverTopics);
        setConversations(serverConversations);
        const latest = serverConversations[0];
        if (latest) {
          const history = await assistantApi.conversation(latest.id);
          if (!active) return;
          setConversationId(latest.id);
          setSubject(history.data.subject || selectedSubject?.name || t('assistantPage.defaults.subject'));
          setTopic(history.data.topic || serverTopics[0]?.name || t('assistantPage.defaults.topic'));
          setMessages(history.data.messages || []);
        } else {
          setTopic(serverTopics[0]?.name || t('assistantPage.defaults.topic'));
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
  }, [t]);

  useEffect(() => {
    if (!messages.length && !thinking) return;
    const frame = window.requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, thinking]);

  const resetTextarea = () => {
    if (textareaRef.current) textareaRef.current.style.height = '44px';
  };

  const sendMessage = async (text = message) => {
    const cleanMessage = text.trim();
    if (!cleanMessage || thinking) return;

    if (authStatus !== 'authenticated' || !tokenStorage.getAccessToken()) {
      setToast(t('assistantPage.toasts.loginFirst'));
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
        setToast(error.message || t('assistantPage.toasts.answerError'));
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
      await aiTutorApi.report(messageId, { reason: t('assistantPage.reportReason') });
      setToast(t('assistantPage.toasts.reported'));
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
      setSubject(result.data.subject || t('assistantPage.defaults.subject'));
      setTopic(result.data.topic || t('assistantPage.defaults.topic'));
      setHistoryOpen(false);
    } catch (error) {
      setToast(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-paper">
      <header className="shrink-0 border-b border-stone-200 bg-paper pt-[env(safe-area-inset-top)]" aria-label={t('assistantPage.chatPanel')}>
        <div className="flex h-16 min-w-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-5">
          <button onClick={() => navigate('/student/dashboard')} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100 lg:hidden" aria-label={t('assistantPage.back')}><ArrowLeft className="h-5 w-5" /></button>
          <img src={mascot} alt="" className="hidden h-10 w-10 shrink-0 rounded-2xl object-cover min-[380px]:block" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-sm font-semibold sm:text-base">SANA</h1>
            <p className="hidden truncate text-xs text-stone-500 min-[350px]:block">{t('assistantPage.assistantTopic', { topic })}</p>
          </div>
          <button onClick={() => setHistoryOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100" aria-label={t('assistantPage.history')}><History className="h-5 w-5" /></button>
          <button onClick={() => setContextOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100 sm:hidden" aria-label={t('assistantPage.chooseTopic')}><BookOpen className="h-5 w-5" /></button>
          <button onClick={() => setContextOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 sm:flex"><BookOpen className="h-4 w-4 text-lavender-600" /><span className="max-w-48 truncate">{topic}</span><ChevronDown className="h-4 w-4" /></button>
          <button onClick={newChat} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-stone-600 transition hover:bg-stone-100" aria-label={t('assistantPage.newChat')}><Plus className="h-5 w-5" /></button>
        </div>
      </header>

      <section ref={scrollAreaRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none]" aria-label={t('assistantPage.dialog')} aria-live="polite" aria-busy={thinking}>
        {messages.length === 0 && !thinking ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
            <div className="text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-100 text-lavender-700"><Sparkles className="h-7 w-7" /></span>
              <h2 className="mt-6 font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{t('assistantPage.welcomeTitle')}</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500 sm:text-base">{t('assistantPage.welcomeText')}</p>
            </div>
            {authStatus !== 'authenticated' && (
              <div className="mx-auto mt-6 w-full max-w-xl rounded-3xl border border-lavender-200 bg-lavender-50 p-5 text-center" role="status">
                <p className="font-extrabold text-ink">{authStatus === 'loading' ? t('assistantPage.checkingLogin') : t('assistantPage.loginRequired')}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{t('assistantPage.loginDescription')}</p>
                {authStatus !== 'loading' && <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => navigate('/register')}>{t('assistantPage.createAccount')}</Button><Button onClick={() => navigate('/login')}>{t('assistantPage.login')}</Button></div>}
              </div>
            )}
            <div className="sana-prompt-grid mt-8 grid gap-3 sm:grid-cols-2">
              {starterPrompts.map(({ icon: Icon, key }) => {
                const title = t(`assistantPage.starters.${key}.title`);
                const text = t(`assistantPage.starters.${key}.text`);
                return (
                <button key={key} disabled={authStatus !== 'authenticated'} onClick={() => sendMessage(`${title}: ${text}`)} className="flex min-h-20 items-center gap-4 rounded-3xl border border-stone-200 bg-paper p-4 text-left transition hover:border-lavender-300 hover:bg-lavender-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Icon className="h-5 w-5" /></span>
                  <span><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs text-stone-500">{text}</span></span>
                </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-3 py-4 min-[380px]:px-4 sm:px-6 sm:py-8">
            <div className="mb-5 flex items-center justify-center gap-2 text-center text-xs font-bold leading-5 text-stone-500 sm:mb-7"><BookOpen className="h-4 w-4 shrink-0 text-lavender-600" /> <span className="break-words">{t('assistantPage.usesTopic', { topic })}</span></div>
            <div className="space-y-5 sm:space-y-7">
              {messages.map((item) => (
                <article key={item.id} className={`sana-message flex min-w-0 gap-2.5 sm:gap-4 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {item.role === 'assistant' && <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span>}
                  <div className={item.role === 'user' ? 'max-w-[82%] break-words rounded-3xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] leading-6 text-white [overflow-wrap:anywhere] sm:max-w-[75%] sm:px-5 sm:py-3' : 'min-w-0 flex-1 break-words text-[15px] leading-6 text-stone-700 [overflow-wrap:anywhere] sm:text-base sm:leading-7'}>
                    <p className="whitespace-pre-wrap">{item.content ?? item.text}</p>
                    {item.hint && <div className="mt-4 rounded-2xl bg-warning-100 p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-warning-700"><Lightbulb className="h-4 w-4" /> {t('assistantPage.yourTurn')}</p><p className="mt-2 text-sm font-semibold leading-6 text-ink">{item.hint}</p></div>}
                    {item.role === 'assistant' && <div className="mt-2 flex gap-1 text-stone-400"><button onClick={() => { navigator.clipboard?.writeText(`${item.content ?? item.text ?? ''} ${item.hint || ''}`.trim()); setToast(t('assistantPage.toasts.copied')); }} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-stone-100 hover:text-ink" aria-label={t('assistantPage.copy')}><Copy className="h-4 w-4" /></button><button onClick={() => setToast(t('assistantPage.toasts.rated'))} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-stone-100 hover:text-ink" aria-label={t('assistantPage.useful')}><ThumbsUp className="h-4 w-4" /></button><button onClick={() => reportMessage(item.id)} className="grid h-11 w-11 place-items-center rounded-xl transition hover:bg-stone-100 hover:text-ink" aria-label={t('assistantPage.notUseful')}><ThumbsDown className="h-4 w-4" /></button></div>}
                  </div>
                </article>
              ))}
              {thinking && messages[messages.length - 1]?.role !== 'assistant' && <div className="sana-message flex items-center gap-4"><span className="sana-avatar-thinking grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span><div className="flex items-center gap-1 rounded-2xl bg-stone-100 px-4 py-3" aria-label={t('assistantPage.thinking')}><span className="sana-thinking-dot h-2 w-2 rounded-full bg-lavender-500" /><span className="sana-thinking-dot h-2 w-2 rounded-full bg-lavender-500" /><span className="sana-thinking-dot h-2 w-2 rounded-full bg-lavender-500" /></div></div>}
            </div>
            <div ref={bottomRef} className="h-2" />
          </div>
        )}
      </section>

      <footer className="shrink-0 border-t border-stone-200 bg-paper px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-3">
        <div className="mx-auto w-full max-w-3xl">
          {messages.length > 0 && !thinking && <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{followUpPrompts.map((key) => { const prompt = t(`assistantPage.followUps.${key}`); return <button key={key} onClick={() => sendMessage(prompt)} className="min-h-10 shrink-0 rounded-full border border-stone-200 px-4 text-xs font-bold text-stone-600 transition hover:border-lavender-300 hover:bg-lavender-50">{prompt}</button>; })}</div>}
          <form onSubmit={handleSubmit} className="flex items-end gap-1 rounded-3xl border border-stone-300 bg-white p-2 shadow-sm transition focus-within:border-lavender-500 focus-within:ring-4 focus-within:ring-lavender-100">
            <label className="sr-only" htmlFor="assistant-message">{t('assistantPage.message')}</label>
            <textarea ref={textareaRef} id="assistant-message" rows="1" value={message} onChange={handleInput} onKeyDown={handleKeyDown} placeholder={t('assistantPage.message')} className="min-h-11 max-h-36 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-2.5 text-base leading-6 outline-none placeholder:text-stone-400" />
            <button type="submit" disabled={!message.trim() || thinking || authStatus !== 'authenticated'} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white transition hover:bg-lavender-700 disabled:bg-stone-200 disabled:text-stone-400" aria-label={t('assistantPage.send')}><ArrowUp className="h-5 w-5" /></button>
          </form>
          <p className="mt-1.5 hidden text-center text-[11px] leading-4 text-stone-400 min-[380px]:block sm:mt-2">{t('assistantPage.disclaimer')}</p>
        </div>
      </footer>

      {historyOpen && <div className="fixed inset-0 z-50 bg-ink/25" onClick={() => setHistoryOpen(false)} aria-hidden="true" />}
      {historyOpen && <aside className="fixed inset-y-0 left-0 z-[60] flex w-[min(340px,88vw)] flex-col border-r border-stone-200 bg-paper pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-2xl lg:left-72" aria-label={t('assistantPage.history')}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-4">
          <div><p className="font-display font-semibold">{t('assistantPage.historyTitle')}</p><p className="text-xs text-stone-500">{t('assistantPage.historyDescription')}</p></div>
          <button onClick={() => setHistoryOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-stone-100" aria-label={t('assistantPage.closeHistory')}><X className="h-5 w-5" /></button>
        </div>
        <div className="p-3"><Button onClick={newChat} className="w-full"><Plus className="h-4 w-4" /> {t('assistantPage.newChat')}</Button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {historyLoading && <p className="p-4 text-center text-sm text-stone-500">{t('assistantPage.loadingHistory')}</p>}
          {!historyLoading && conversations.length === 0 && <p className="rounded-2xl bg-stone-100 p-4 text-sm leading-6 text-stone-500">{t('assistantPage.emptyHistory')}</p>}
          <div className="space-y-1">
            {conversations.map((conversation) => <button key={conversation.id} onClick={() => openConversation(conversation.id)} className={`w-full rounded-2xl px-4 py-3 text-left transition hover:bg-stone-100 ${conversation.id === conversationId ? 'bg-lavender-100' : ''}`}><span className="block truncate text-sm font-bold">{conversation.title}</span><span className="mt-1 block truncate text-xs text-stone-500">{conversation.topic}</span></button>)}
          </div>
        </div>
      </aside>}

      <Dialog open={contextOpen} onClose={() => setContextOpen(false)} title={t('assistantPage.contextTitle')} description={t('assistantPage.contextDescription')} footer={<><Button variant="ghost" onClick={() => setContextOpen(false)}>{t('assistantPage.cancel')}</Button><Button onClick={() => { newChat(); setContextOpen(false); setToast(t('assistantPage.toasts.contextUpdated')); }}><Check className="h-5 w-5" /> {t('assistantPage.apply')}</Button></>}>
        <div className="space-y-5"><div><label className="field-label" htmlFor="assistant-topic">{t('assistantPage.catalogTopic')}</label><select id="assistant-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="field-control">{topics.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div><p className="rounded-2xl bg-lavender-50 p-4 text-sm font-semibold">{t('assistantPage.serverContext')}</p></div>
      </Dialog>
      <StatusToast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
