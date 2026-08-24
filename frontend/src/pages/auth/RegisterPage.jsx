import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../features/auth/RegisterForm';
import { useAuthStore } from '../../features/auth/authStore';
import { Brand } from '../../components/layout/Header';
import { LanguageSwitcher } from '../../components/navigation/LanguageSwitcher';
import { useI18n } from '../../shared/i18n/i18n';

export function RegisterPage() {
  const { locale, t } = useI18n();
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async (form) => {
    setError('');
    try { const result = await register({ ...form, locale }); navigate(result.data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/onboarding'); }
    catch (requestError) { setError(requestError.message); }
  };

  return <main className="min-h-screen overflow-x-hidden bg-lavender-50 p-4 sm:p-8">
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><Brand /><LanguageSwitcher navbar /></div>
      <div className="mt-8 grid overflow-hidden rounded-4xl border border-stone-200 bg-paper shadow-soft lg:grid-cols-[0.85fr_1.15fr]">
        <div className="min-w-0 bg-ink p-7 text-white sm:p-12"><p className="eyebrow text-lime">{t('auth.minutes')}</p><h1 className="mt-4 break-words font-display text-4xl font-semibold leading-tight tracking-[-0.05em]">{t('auth.registerTitle')}</h1><div className="mt-10 space-y-5 text-sm text-stone-300">{t('auth.benefits').map((item, index) => <p key={item} className="flex gap-3"><span className="shrink-0 font-display text-lime">0{index + 1}</span><span className="break-words">{item}</span></p>)}</div></div>
        <div className="min-w-0 p-6 sm:p-10">{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</div>}<RegisterForm loading={status === 'loading'} onSubmit={submit} /><p className="mt-6 text-center text-sm text-stone-600">{t('auth.hasAccount')} <Link to="/login" className="font-bold text-lavender-700">{t('common.login')}</Link></p></div>
      </div>
    </div>
  </main>;
}
