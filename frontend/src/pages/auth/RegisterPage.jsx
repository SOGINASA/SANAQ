import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../features/auth/RegisterForm';
import { useAuthStore } from '../../features/auth/authStore';
import { Brand } from '../../components/layout/Header';

export function RegisterPage() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  return <main className="min-h-screen bg-lavender-50 p-4 sm:p-8"><div className="mx-auto max-w-5xl"><Brand /><div className="mt-8 grid overflow-hidden rounded-4xl border border-stone-200 bg-paper shadow-soft lg:grid-cols-[0.85fr_1.15fr]"><div className="bg-ink p-8 text-white sm:p-12"><p className="eyebrow text-lime">4 минуты до маршрута</p><h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.05em]">Создай профиль, который учится вместе с тобой</h1><div className="mt-10 space-y-5 text-sm text-stone-300">{['Диагностика вместо случайного старта', 'Рекомендации с понятной причиной', 'Русский и казахский интерфейс'].map((item, i) => <p key={item} className="flex gap-3"><span className="font-display text-lime">0{i + 1}</span>{item}</p>)}</div></div><div className="p-6 sm:p-10"><RegisterForm onSubmit={(form) => { login({ name: form.name || 'Айару', role: form.role }); navigate(form.role === 'teacher' ? '/teacher/dashboard' : '/student/onboarding'); }} /><p className="mt-6 text-center text-sm text-stone-600">Уже есть аккаунт? <Link to="/login" className="font-bold text-lavender-700">Войти</Link></p></div></div></div></main>;
}
