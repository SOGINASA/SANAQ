import { useState } from 'react';
import { Button } from '../../shared/ui';

export function RegisterForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  return <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-5">
    <fieldset><legend className="field-label">Я регистрируюсь как</legend><div className="grid grid-cols-2 gap-3">{[['student', 'Ученик'], ['teacher', 'Учитель']].map(([value, label]) => <label key={value} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border font-bold ${form.role === value ? 'border-lavender-500 bg-lavender-100 text-lavender-700' : 'border-stone-300 bg-paper'}`}><input className="sr-only" type="radio" name="role" value={value} checked={form.role === value} onChange={(e) => setForm({ ...form, role: e.target.value })} />{label}</label>)}</div></fieldset>
    <div><label className="field-label" htmlFor="name">Имя</label><input id="name" required autoComplete="name" className="field-control" placeholder="Как к вам обращаться" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
    <div><label className="field-label" htmlFor="reg-email">Email</label><input id="reg-email" required type="email" autoComplete="email" className="field-control" placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
    <div><label className="field-label" htmlFor="reg-password">Пароль</label><input id="reg-password" required minLength="6" type="password" autoComplete="new-password" className="field-control" placeholder="Минимум 6 символов" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
    <label className="flex items-start gap-3 text-sm text-stone-600"><input required type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-lavender-600" /><span>Я принимаю условия использования и согласен на обработку данных для учебного профиля.</span></label>
    <Button type="submit" className="w-full">Создать аккаунт</Button>
  </form>;
}
