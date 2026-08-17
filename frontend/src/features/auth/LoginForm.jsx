import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../shared/ui';

export function LoginForm({ onSubmit }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ email: 'student@sanaq.kz', password: 'demo123' });
  const [loading, setLoading] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => { setLoading(false); onSubmit(form); }, 450);
  };
  return <form onSubmit={submit} className="space-y-5">
    <div><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required className="field-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
    <div><label className="field-label" htmlFor="password">Пароль</label><div className="relative"><input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required minLength="6" className="field-control pr-14" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-xl" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
    <div className="flex items-center justify-between gap-4 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-lavender-600" /> Запомнить меня</label><button type="button" className="font-bold text-lavender-700">Забыли пароль?</button></div>
    <Button type="submit" loading={loading} className="w-full">Войти в SANAQ</Button>
  </form>;
}
