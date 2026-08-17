import { useState } from 'react';
import { useAuthStore } from '../../features/auth/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const { login, register, status } = useAuthStore();

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLocalError('');
    try {
      if (mode === 'register') {
        await register({ ...form, role: 'student', locale: 'ru' });
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (error) {
      setLocalError(error.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand-mark" aria-hidden="true">S</div>
        <p className="eyebrow">SANAQ · персональный маршрут</p>
        <h1>Понимай, что учить следующим.</h1>
        <p className="auth-lead">
          Диагностика находит конкретный пробел, маршрут объясняет выбор следующего шага,
          а прогресс обновляется после каждого реального ответа.
        </p>
        <div className="auth-proof">
          <span className="status-dot" />
          Подключено к Flask API. Mock-данные автоматически не подставляются.
        </div>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">Учебный кабинет</p>
        <h2 id="auth-title">{mode === 'register' ? 'Создать профиль' : 'Продолжить обучение'}</h2>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Имя
              <input name="name" value={form.name} onChange={update} required maxLength={100} />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={update} required />
          </label>
          <label>
            Пароль
            <input name="password" type="password" value={form.password} onChange={update} minLength={8} required />
          </label>
          {localError && <div className="error-banner" role="alert">{localError}</div>}
          <button className="primary-button" disabled={status === 'loading'}>
            {status === 'loading' ? 'Подключаемся…' : mode === 'register' ? 'Начать' : 'Войти'}
          </button>
        </form>
        <button className="text-button" type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
          {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </button>
      </section>
    </main>
  );
}
