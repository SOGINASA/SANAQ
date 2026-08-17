import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from './authApi';
import { Button, Dialog, StatusToast } from '../../shared/ui';

export function LoginForm({ onSubmit }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (_error) {
      // Ошибка показана страницей входа; mock/fallback не подставляется.
    } finally {
      setLoading(false);
    }
  };

  const openRecovery = () => {
    setRecoveryEmail(form.email);
    setRecoveryError('');
    setRecoveryOpen(true);
  };

  const requestRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryError('');
    try {
      const result = await authApi.forgotPassword(recoveryEmail);
      setRecoveryOpen(false);
      setStatus(result.data.message || 'Инструкции по восстановлению отправлены');
    } catch (error) {
      setRecoveryError(`${error.message} Fallback-ответ не подставлялся.`);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required className="field-control" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
        <div><label className="field-label" htmlFor="password">Пароль</label><div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required minLength="6" className="field-control pr-14" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-xl" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
        <div className="flex items-center justify-between gap-4 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-lavender-600" /> Запомнить меня</label><button type="button" onClick={openRecovery} className="font-bold text-lavender-700">Забыли пароль?</button></div>
        <Button type="submit" loading={loading} className="w-full">Войти в SANAQ</Button>
      </form>
      <Dialog open={recoveryOpen} onClose={() => setRecoveryOpen(false)} title="Восстановление доступа" description="Backend примет запрос и отправит инструкции, если аккаунт существует." footer={<><Button variant="ghost" onClick={() => setRecoveryOpen(false)}>Отмена</Button><Button loading={recoveryLoading} disabled={!recoveryEmail} onClick={requestRecovery}>Отправить запрос</Button></>}>
        <div><label className="field-label" htmlFor="recovery-email">Email аккаунта</label><input id="recovery-email" type="email" required className="field-control" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} /></div>
        {recoveryError && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{recoveryError}</div>}
      </Dialog>
      <StatusToast message={status} onClose={() => setStatus('')} />
    </>
  );
}
