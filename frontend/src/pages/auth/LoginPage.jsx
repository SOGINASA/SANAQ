import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../features/auth/LoginForm';
import { useAuthStore } from '../../features/auth/authStore';
import { Brand } from '../../components/layout/Header';
import mascot from '../../assets/images/sana-mascot.png';

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (form) => {
    setError('');
    try {
      const result = await login(form);
      navigate(result.data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    }
  };

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="flex flex-col p-5 sm:p-8 lg:p-12">
        <Brand />
        <div className="mx-auto my-auto w-full max-w-md py-12">
          <p className="eyebrow">С возвращением</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.05em]">Продолжим с нужного места</h1>
          <p className="mt-3 text-stone-600">Вход выполняется через SANAQ Backend API. Демо-аккаунт автоматически не подставляется.</p>
          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="mt-8"><LoginForm onSubmit={submit} /></div>
          <p className="mt-7 text-center text-sm text-stone-600">Нет аккаунта? <Link className="font-bold text-lavender-700" to="/register">Зарегистрироваться</Link></p>
        </div>
      </div>
      <div className="hero-grid hidden place-items-center overflow-hidden bg-lavender-100 p-12 lg:grid">
        <div className="max-w-lg text-center">
          <img src={mascot} alt="SANA встречает ученика" className="mascot-image mx-auto aspect-square w-[390px] rounded-full object-cover" />
          <p className="mt-2 font-display text-2xl font-semibold">«Я сохраню твой маршрут и продолжу с нужного шага»</p>
        </div>
      </div>
    </main>
  );
}
