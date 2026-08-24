import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../features/auth/LoginForm';
import { useAuthStore } from '../../features/auth/authStore';
import { Brand } from '../../components/layout/Header';
import { LanguageSwitcher } from '../../components/navigation/LanguageSwitcher';
import { useI18n } from '../../shared/i18n/i18n';
import mascot from '../../assets/images/sana-mascot.png';
import { GraduationCap, School, ShieldCheck } from 'lucide-react';

const demoAccounts = [
  { role: 'student', email: 'student@sanaq.demo', icon: GraduationCap, tone: 'bg-lavender-100 text-lavender-700' },
  { role: 'teacher', email: 'teacher@sanaq.demo', icon: School, tone: 'bg-mint-100 text-mint-700' },
  { role: 'admin', email: 'admin@sanaq.demo', icon: ShieldCheck, tone: 'bg-amber-100 text-amber-800' },
];

export function LoginPage() {
  const { t } = useI18n();
  const login = useAuthStore((state) => state.login);
  const loginWithPasskey = useAuthStore((state) => state.loginWithPasskey);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState('');
  const showDemoLogin = process.env.REACT_APP_SHOW_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  const navigate = useNavigate();
  const submit = async (form) => {
    setError('');
    try { const result = await login(form); const role = result.data.user.role; navigate(role === 'admin' ? '/admin/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'); }
    catch (requestError) { setError(requestError.message); throw requestError; }
  };
  const demoLogin = async (account) => {
    setDemoLoading(account.role);
    try { await submit({ email: account.email, password: 'SanaqDemo2026!' }); }
    catch (_error) { /* submit already presents the error. */ }
    finally { setDemoLoading(''); }
  };
  const passkeyLogin = async () => {
    setError('');
    const result = await loginWithPasskey();
    const role = result.data.user.role;
    navigate(role === 'admin' ? '/admin/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
  };

  return <main className="grid min-h-screen bg-canvas lg:grid-cols-2">
    <div className="flex min-w-0 flex-col p-5 sm:p-8 lg:p-12">
      <div className="flex flex-wrap items-center justify-between gap-3"><Brand /><LanguageSwitcher compact /></div>
      <div className="mx-auto my-auto w-full max-w-md py-12">
        <p className="eyebrow">{t('auth.welcomeBack')}</p><h1 className="mt-4 break-words font-display text-4xl font-semibold tracking-[-0.05em]">{t('auth.loginTitle')}</h1><p className="mt-3 text-stone-600">{t('auth.loginDescription')}</p>
        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{error}</div>}
        <div className="mt-8"><LoginForm onSubmit={submit} onPasskeyLogin={passkeyLogin} /></div>
        {showDemoLogin && <section className="mt-7 border-t border-stone-200 pt-6" aria-labelledby="demo-login-title"><div className="flex items-center gap-3"><span className="h-px flex-1 bg-stone-200" /><h2 id="demo-login-title" className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">{t('loginDemo.title')}</h2><span className="h-px flex-1 bg-stone-200" /></div><div className="mt-4 grid gap-2">{demoAccounts.map((account) => { const Icon = account.icon; return <button key={account.role} type="button" disabled={Boolean(demoLoading)} onClick={() => demoLogin(account)} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-paper px-3 text-left transition hover:border-lavender-300 hover:bg-lavender-50 disabled:cursor-wait disabled:opacity-50"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${account.tone}`}><Icon className={`h-5 w-5 ${demoLoading === account.role ? 'animate-pulse' : ''}`} /></span><span className="min-w-0 flex-1"><strong className="block">{t('loginDemo.asRole', { role: t(`roles.${account.role}`).toLowerCase() })}</strong><span className="block truncate text-xs text-stone-500">{account.email}</span></span><span className="text-lg text-stone-400">→</span></button>; })}</div></section>}
        <p className="mt-7 text-center text-sm text-stone-600">{t('auth.noAccount')} <Link className="font-bold text-lavender-700" to="/register">{t('auth.register')}</Link></p>
      </div>
    </div>
    <div className="hero-grid hidden place-items-center overflow-hidden bg-lavender-100 p-12 lg:grid"><div className="max-w-lg text-center"><img src={mascot} alt={t('auth.mascotAlt')} className="mascot-image mx-auto aspect-square w-[390px] rounded-full object-cover" /><p className="mt-2 font-display text-2xl font-semibold">“{t('auth.mascotQuote')}”</p></div></div>
  </main>;
}
