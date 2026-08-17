import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../features/auth/RegisterForm';
import { useAuthStore } from '../../features/auth/authStore';
import { Brand } from '../../components/layout/Header';

export function RegisterPage() {
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (form) => {
    setError('');
    try {
      const result = await register({ ...form, locale: 'ru' });
      navigate(result.data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/onboarding');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="min-h-screen bg-lavender-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Brand />
        <div className="mt-8 grid overflow-hidden rounded-4xl border border-stone-200 bg-paper shadow-soft lg:grid-cols-[0.85fr_1.15fr]">
          <div className="bg-ink p-8 text-white sm:p-12">
            <p className="eyebrow text-lime">4 минуты до маршрута</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.05em]">Создай профиль, который учится вместе с тобой</h1>
            <div className="mt-10 space-y-5 text-sm text-stone-300">
              {['Диагностика вместо случайного старта', 'Рекомендации с понятной причиной', 'Русский и казахский интерфейс'].map((item, index) => (
                <p key={item} className="flex gap-3"><span className="font-display text-lime">0{index + 1}</span>{item}</p>
              ))}
            </div>
          </div>
          <div className="p-6 sm:p-10">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
                {error}
              </div>
            )}
            <RegisterForm loading={status === 'loading'} onSubmit={submit} />
            <p className="mt-6 text-center text-sm text-stone-600">Уже есть аккаунт? <Link to="/login" className="font-bold text-lavender-700">Войти</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}
