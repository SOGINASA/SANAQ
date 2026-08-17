import { useState } from 'react';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { Card, StatusToast } from '../../shared/ui';

function Toggle({ checked, onChange, label, description }) {
  return <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-stone-200 py-5 last:border-0"><span><span className="block font-bold">{label}</span><span className="mt-1 block text-sm text-stone-500">{description}</span></span><input type="checkbox" checked={checked} onChange={onChange} className="h-6 w-11 cursor-pointer accent-lavender-600" /></label>;
}

export function SettingsPage() {
  const store = useAccessibilityStore();
  const [reviews, setReviews] = useState(true);
  const [deadlines, setDeadlines] = useState(true);
  const [status, setStatus] = useState('');
  const updateReminder = (setter, value) => { setter(value); setStatus('Настройки напоминаний сохранены'); };
  return <div className="mx-auto max-w-4xl animate-rise"><div><p className="eyebrow">Под тебя</p><h1 className="page-title mt-3">Настройки</h1></div><Card className="mt-8 p-6 sm:p-8"><h2 className="text-xl font-extrabold">Язык интерфейса</h2><div className="mt-5 grid grid-cols-2 gap-3">{[['ru', 'Русский'], ['kk', 'Қазақша']].map(([value, label]) => <button key={value} onClick={() => { store.setLocale(value); setStatus(`Выбран язык: ${label}`); }} className={`min-h-12 rounded-2xl border-2 font-bold ${store.locale === value ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-200'}`}>{label}</button>)}</div></Card><Card className="mt-5 p-6 sm:p-8"><h2 className="text-xl font-extrabold">Доступность</h2><div className="mt-3"><Toggle checked={store.largeText} onChange={store.toggleLargeText} label="Увеличенный текст" description="Сделать основной текст и элементы управления крупнее" /><Toggle checked={store.highContrast} onChange={store.toggleHighContrast} label="Высокий контраст" description="Усилить различия между текстом и поверхностями" /><Toggle checked={store.reducedMotion} onChange={store.toggleReducedMotion} label="Уменьшить анимацию" description="Отключить плавание SANA и декоративные переходы" /></div></Card><Card className="mt-5 p-6 sm:p-8"><h2 className="text-xl font-extrabold">Напоминания</h2><div className="mt-3"><Toggle checked={reviews} onChange={(event) => updateReminder(setReviews, event.target.checked)} label="Повторение тем" description="Напомнить, когда знание начинает забываться" /><Toggle checked={deadlines} onChange={(event) => updateReminder(setDeadlines, event.target.checked)} label="Дедлайны целей" description="Предупредить за 7, 3 и 1 день" /></div></Card><StatusToast message={status} onClose={() => setStatus('')} /></div>;
}
