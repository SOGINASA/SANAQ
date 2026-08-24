import { authApi } from './authApi';
import { useI18n } from '../../shared/i18n/i18n';

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-4V7.4H3.2a10 10 0 0 0 0 9.2L6.5 14Z" />
    <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.8 5.4L6.5 10A5.8 5.8 0 0 1 12 5.9Z" />
  </svg>;
}

export function GoogleAuthButton({ role = 'student' }) {
  const { locale, t } = useI18n();
  const startGoogleLogin = () => {
    window.location.assign(authApi.googleLoginUrl({ role, locale }));
  };

  return <button type="button" onClick={startGoogleLogin} className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-stone-300 bg-paper px-5 font-bold text-ink transition hover:border-lavender-400 hover:bg-lavender-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender-600">
    <GoogleIcon />
    <span>{t('googleAuth.continueWithGoogle')}</span>
  </button>;
}

export function AuthDivider() {
  const { t } = useI18n();
  return <div className="flex items-center gap-3 py-1" aria-hidden="true">
    <span className="h-px flex-1 bg-stone-200" />
    <span className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">{t('googleAuth.or')}</span>
    <span className="h-px flex-1 bg-stone-200" />
  </div>;
}
