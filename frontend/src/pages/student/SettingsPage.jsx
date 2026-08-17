import { useEffect, useState } from 'react';
import { CheckCircle2, Link2, Plus, Trash2 } from 'lucide-react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { notificationsApi } from '../../features/notifications/notificationsApi';
import { profileApi } from '../../shared/api/profileApi';
import { Button, Card, StatusToast } from '../../shared/ui';
import { goalsApi } from '../../features/goals/goalsApi';

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-stone-200 py-5 last:border-0">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="mt-1 block text-sm text-stone-500">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="h-6 w-11 cursor-pointer accent-lavender-600" />
    </label>
  );
}

export function SettingsPage() {
  const store = useAccessibilityStore();
  const [reviews, setReviews] = useState(true);
  const [deadlines, setDeadlines] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [goals, setGoals] = useState([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([notificationsApi.preferences(), goalsApi.list()])
      .then(([preferencesResponse, goalsResponse]) => {
        setReviews(preferencesResponse.data.preferences.reviews);
        setDeadlines(preferencesResponse.data.preferences.deadlines);
        setGoals(goalsResponse.data.items || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const updateReminder = async (key, value) => {
    const next = { reviews, deadlines, [key]: value };
    setReviews(next.reviews);
    setDeadlines(next.deadlines);
    setError('');
    try {
      await notificationsApi.savePreferences(next);
      setStatus('Настройки напоминаний сохранены');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateLocale = async (value, label) => {
    store.setLocale(value);
    setError('');
    try {
      await profileApi.update({ locale: value });
      setStatus(`Выбран язык: ${label}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateAccessibility = (action) => {
    action();
    window.setTimeout(async () => {
      const state = useAccessibilityStore.getState();
      setError('');
      try {
        await profileApi.savePreferences({
          accessibility: {
            font_scale: state.largeText ? 1.2 : 1,
            high_contrast: state.highContrast,
            reduced_motion: state.reducedMotion,
          },
        });
        setStatus('Настройки доступности сохранены');
      } catch (requestError) {
        setError(requestError.message);
      }
    }, 0);
  };

  const joinClass = async (event) => {
    event.preventDefault();
    setJoining(true);
    setError('');
    try {
      const response = await profileApi.joinClass(joinCode.trim().toUpperCase());
      setJoinCode('');
      setStatus(`Вы вступили в класс «${response.data.class.name}»`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoining(false);
    }
  };

  const createGoal = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await goalsApi.create({ title: goalTitle.trim(), target_date: goalDate || null });
      setGoals((items) => [...items, response.data.goal]);
      setGoalTitle(''); setGoalDate(''); setStatus('Цель сохранена на сервере');
    } catch (requestError) { setError(requestError.message); }
  };

  const updateGoal = async (goal, statusValue) => {
    setError('');
    try {
      const response = await goalsApi.update(goal.id, { status: statusValue });
      setGoals((items) => items.map((item) => item.id === goal.id ? response.data.goal : item));
    } catch (requestError) { setError(requestError.message); }
  };

  const removeGoal = async (goal) => {
    setError('');
    try {
      await goalsApi.remove(goal.id);
      setGoals((items) => items.filter((item) => item.id !== goal.id));
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <div><p className="eyebrow">Под тебя</p><h1 className="page-title mt-3">Настройки</h1></div>
      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}

      <Card className="mt-8 p-6 sm:p-8">
        <div className="flex items-center gap-3"><Link2 className="h-6 w-6 text-lavender-600" /><h2 className="text-xl font-extrabold">Подключиться к классу</h2></div>
        <p className="mt-2 text-sm text-stone-500">Введите код, который выдал учитель. После подключения здесь появятся его назначения и комментарии.</p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={joinClass}>
          <label className="sr-only" htmlFor="join-code">Код класса</label>
          <input id="join-code" className="field-control uppercase" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Например, A1B2C3" maxLength="20" />
          <Button type="submit" loading={joining} disabled={!joinCode.trim()}>Подключиться</Button>
        </form>
      </Card>

      <Card className="mt-5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Учебные цели</h2>
        <p className="mt-2 text-sm text-stone-500">Цели и сроки хранятся в профиле на сервере.</p>
        <form onSubmit={createGoal} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input className="field-control" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="Например, подготовиться к контрольной" />
          <input type="date" className="field-control" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} />
          <Button type="submit" disabled={!goalTitle.trim()}><Plus className="h-5 w-5" /> Добавить</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {goals.map((goal) => <div key={goal.id} className="flex items-center gap-3 rounded-2xl bg-stone-100 p-4"><button onClick={() => updateGoal(goal, goal.status === 'completed' ? 'active' : 'completed')} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${goal.status === 'completed' ? 'bg-mint-500 text-white' : 'bg-paper text-stone-400'}`} aria-label="Изменить статус цели"><CheckCircle2 className="h-5 w-5" /></button><div className="min-w-0 flex-1"><strong className={`block ${goal.status === 'completed' ? 'line-through opacity-60' : ''}`}>{goal.title}</strong>{goal.target_date && <span className="text-xs text-stone-500">до {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}</span>}</div><button onClick={() => removeGoal(goal)} className="grid h-10 w-10 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-700" aria-label="Удалить цель"><Trash2 className="h-4 w-4" /></button></div>)}
          {!goals.length && <p className="text-sm text-stone-500">Активных целей пока нет.</p>}
        </div>
      </Card>

      <Card className="mt-5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Язык интерфейса</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[['ru', 'Русский'], ['kk', 'Қазақша']].map(([value, label]) => (
            <button key={value} onClick={() => updateLocale(value, label)} className={`min-h-12 rounded-2xl border-2 font-bold ${store.locale === value ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200'}`}>{label}</button>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Доступность</h2>
        <div className="mt-3">
          <Toggle checked={store.largeText} onChange={() => updateAccessibility(store.toggleLargeText)} label="Увеличенный текст" description="Сделать основной текст и элементы управления крупнее" />
          <Toggle checked={store.highContrast} onChange={() => updateAccessibility(store.toggleHighContrast)} label="Высокий контраст" description="Усилить различия между текстом и поверхностями" />
          <Toggle checked={store.reducedMotion} onChange={() => updateAccessibility(store.toggleReducedMotion)} label="Уменьшить анимацию" description="Отключить декоративные переходы" />
        </div>
      </Card>

      <Card className="mt-5 p-6 sm:p-8">
        <h2 className="text-xl font-extrabold">Напоминания</h2>
        <div className="mt-3">
          <Toggle checked={reviews} onChange={(event) => updateReminder('reviews', event.target.checked)} label="Повторение тем" description="Напомнить, когда знание начинает забываться" />
          <Toggle checked={deadlines} onChange={(event) => updateReminder('deadlines', event.target.checked)} label="Дедлайны назначений" description="Предупредить о приближении срока" />
        </div>
      </Card>
      <StatusToast message={status} onClose={() => setStatus('')} />
    </div>
  );
}
