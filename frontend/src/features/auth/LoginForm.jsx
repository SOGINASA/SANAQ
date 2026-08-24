import { useState } from 'react';
import { Eye, EyeOff, Fingerprint } from 'lucide-react';
import { authApi } from './authApi';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { AuthDivider, GoogleAuthButton } from './GoogleAuthButton';
import { isPasskeySupported, passkeyBrowserError } from './passkeyClient';

export function LoginForm({ onSubmit, onPasskeyLogin }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [status, setStatus] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');

  const submit = async (event) => {
    event.preventDefault(); setLoading(true);
    try { await onSubmit(form); } catch (_error) { /* The page presents API errors. */ }
    finally { setLoading(false); }
  };
  const openRecovery = () => { setRecoveryEmail(form.email); setRecoveryError(''); setRecoveryOpen(true); };
  const loginWithPasskey = async () => {
    setPasskeyLoading(true); setPasskeyError('');
    try { await onPasskeyLogin(); }
    catch (error) { setPasskeyError(passkeyBrowserError(error, t)); }
    finally { setPasskeyLoading(false); }
  };
  const requestRecovery = async () => {
    setRecoveryLoading(true); setRecoveryError('');
    try { const result = await authApi.forgotPassword(recoveryEmail); setRecoveryOpen(false); setStatus(result.data.message || t('auth.recoverySent')); }
    catch (error) { setRecoveryError(error.message); }
    finally { setRecoveryLoading(false); }
  };

  return <>
    <form onSubmit={submit} className="space-y-5">
      <Button type="button" variant="outline" loading={passkeyLoading} disabled={!isPasskeySupported()} onClick={loginWithPasskey} className="w-full"><Fingerprint className="h-5 w-5" /> {t('passkeys.signIn')}</Button>
      {passkeyError && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{passkeyError}</div>}
      <GoogleAuthButton />
      <AuthDivider />
      <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required className="field-control" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
      <div><label className="field-label" htmlFor="password">{t('auth.password')}</label><div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required minLength="6" className="field-control pr-14" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-1 top-1 grid h-10 w-10 cursor-pointer place-items-center rounded-xl" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
      <div className="flex flex-col items-start gap-3 text-sm min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between"><label className="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-lavender-600" /> {t('auth.remember')}</label><button type="button" onClick={openRecovery} className="cursor-pointer break-words text-left font-bold text-lavender-700">{t('auth.forgot')}</button></div>
      <Button type="submit" loading={loading} className="w-full">{t('auth.signIn')}</Button>
    </form>
    <Dialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} title={t('auth.recovery')} description={t('auth.recoveryDescription')} footer={<><Button variant="ghost" onClick={() => setRecoveryOpen(false)}>{t('auth.cancel')}</Button><Button loading={recoveryLoading} disabled={!recoveryEmail} onClick={requestRecovery}>{t('auth.sendRequest')}</Button></>}>
      <div><label className="field-label" htmlFor="recovery-email">{t('auth.accountEmail')}</label><input id="recovery-email" type="email" required className="field-control" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} /></div>
      {recoveryError && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{recoveryError}</div>}
    </Dialog>
    <StatusToast message={status} onClose={() => setStatus('')} />
  </>;
}
