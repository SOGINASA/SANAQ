import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { Brand } from '../../components/layout/Header';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';

const errorKeys = {
  not_configured: 'googleAuth.errors.notConfigured',
  access_denied: 'googleAuth.errors.accessDenied',
  provider_error: 'googleAuth.errors.providerError',
  unverified_email: 'googleAuth.errors.unverifiedEmail',
  account_disabled: 'googleAuth.errors.accountDisabled',
};

export function GoogleCallbackPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const completeGoogleLogin = useAuthStore((state) => state.completeGoogleLogin);
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const providerError = searchParams.get('error');
    const code = searchParams.get('code');
    if (providerError || !code) {
      setError(t(errorKeys[providerError] || 'googleAuth.errors.invalidResponse'));
      return;
    }
    completeGoogleLogin(code)
      .then((result) => {
        const { user, is_new_user: isNewUser } = result.data;
        const destination = user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'teacher'
            ? '/teacher/dashboard'
            : isNewUser ? '/student/onboarding' : '/student/dashboard';
        navigate(destination, { replace: true });
      })
      .catch((requestError) => setError(requestError.message || t('googleAuth.errors.invalidResponse')));
  }, [completeGoogleLogin, navigate, searchParams, t]);

  return <main className="grid min-h-screen place-items-center bg-lavender-50 p-5">
    <section className="w-full max-w-md rounded-4xl border border-stone-200 bg-paper p-8 text-center shadow-soft">
      <div className="flex justify-center"><Brand /></div>
      {error ? <>
        <h1 className="mt-8 font-display text-2xl font-semibold">{t('googleAuth.errorTitle')}</h1>
        <p className="mt-3 text-stone-600" role="alert">{error}</p>
        <Link to="/login" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-lavender-600 px-5 font-bold text-white">{t('googleAuth.backToLogin')}</Link>
      </> : <>
        <LoaderCircle className="mx-auto mt-8 h-9 w-9 animate-spin text-lavender-600" aria-hidden="true" />
        <h1 className="mt-5 font-display text-2xl font-semibold">{t('googleAuth.completing')}</h1>
      </>}
    </section>
  </main>;
}
