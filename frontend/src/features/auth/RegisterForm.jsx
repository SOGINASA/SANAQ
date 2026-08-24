import { useState } from 'react';
import { Button } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { AuthDivider, GoogleAuthButton } from './GoogleAuthButton';

export function RegisterForm({ onSubmit, loading = false }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const roles = [['student', t('auth.student')], ['teacher', t('auth.teacher')]];
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-5">
    <fieldset><legend className="field-label">{t('auth.registerAs')}</legend><div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">{roles.map(([value, label]) => <label key={value} className={`flex min-h-12 cursor-pointer items-center justify-center break-words rounded-2xl border px-3 text-center font-bold ${form.role === value ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-300 bg-paper'}`}><input className="sr-only" type="radio" name="role" value={value} checked={form.role === value} onChange={(event) => setForm({ ...form, role: event.target.value })} />{label}</label>)}</div></fieldset>
    <GoogleAuthButton role={form.role} />
    <AuthDivider />
    <div><label className="field-label" htmlFor="name">{t('auth.name')}</label><input id="name" required autoComplete="name" className="field-control" placeholder={t('auth.namePlaceholder')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
    <div><label className="field-label" htmlFor="reg-email">Email</label><input id="reg-email" required type="email" autoComplete="email" className="field-control" placeholder="name@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
    <div><label className="field-label" htmlFor="reg-password">{t('auth.password')}</label><input id="reg-password" required minLength="8" type="password" autoComplete="new-password" className="field-control" placeholder={t('auth.passwordHint')} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></div>
    <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-600"><input required type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-lavender-600" /><span className="break-words">{t('auth.consent')}</span></label>
    <Button type="submit" loading={loading} className="w-full">{t('auth.createAccount')}</Button>
  </form>;
}
