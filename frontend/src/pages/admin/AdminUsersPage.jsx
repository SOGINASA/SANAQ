import { useCallback, useEffect, useState } from 'react';
import { KeyRound, MoreHorizontal, Plus, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

const emptyUser = { name: '', email: '', password: '', role: 'student' };

export function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const roleName = (value) => t(`roles.${value}`);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { const response = await adminApi.users({ search, role }); setUsers(response.data.items || []); setTotal(response.data.total || 0); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [role, search]);
  useEffect(() => { const timeout = window.setTimeout(load, 250); return () => window.clearTimeout(timeout); }, [load]);

  const runAction = async (action, message, close) => {
    setActionLoading(true);
    setError('');
    try { await action(); close?.(); setToast(t(message)); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const createUser = () => runAction(() => adminApi.createUser(form), 'adminUsers.created', () => { setCreateOpen(false); setForm(emptyUser); });
  const saveUser = () => runAction(async () => { await adminApi.updateUser(editor.id, { name: editor.name, email: editor.email }); await adminApi.updateUserStatus(editor.id, { role: editor.role }); }, 'adminUsers.saved', () => { setEditor(null); setSelected(null); });
  const toggleStatus = () => runAction(() => adminApi.updateUserStatus(selected.id, { is_active: !selected.is_active }), selected.is_active ? 'adminUsers.blocked' : 'adminUsers.restored', () => setSelected(null));
  const resetPassword = () => runAction(() => adminApi.resetPassword(selected.id, password), 'adminUsers.passwordSet', () => { setResetOpen(false); setSelected(null); setPassword(''); });

  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow={t('adminUsers.eyebrow')} title={t('adminUsers.title')} description={t('adminUsers.description')} actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> {t('adminUsers.newUser')}</Button>} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <Card className="mt-7 p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative block min-w-0 flex-1"><span className="sr-only">{t('adminUsers.search')}</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input className="field-control pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('adminUsers.searchPlaceholder')} /></label><label><span className="sr-only">{t('adminUsers.role')}</span><select className="field-control sm:w-52" value={role} onChange={(event) => setRole(event.target.value)}><option value="">{t('adminUsers.allRoles')}</option>{['student', 'teacher', 'admin'].map((value) => <option key={value} value={value}>{roleName(value)}</option>)}</select></label></div><p className="mt-3 text-sm text-stone-500">{t('adminUsers.found', { count: total })}</p></Card>
    {loading && !users.length ? <Skeleton className="mt-5" lines={9} /> : <Card className="mt-5 overflow-hidden"><div className="hidden grid-cols-[minmax(0,1.3fr)_180px_140px_64px] gap-4 border-b border-stone-200 bg-stone-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 md:grid"><span>{t('adminUsers.user')}</span><span>{t('adminUsers.role')}</span><span>{t('adminUsers.status')}</span><span /></div><div className="divide-y divide-stone-200">{users.map((item) => <div key={item.id} className="grid min-w-0 gap-4 p-5 md:grid-cols-[minmax(0,1.3fr)_180px_140px_64px] md:items-center md:px-6"><div className="min-w-0"><p className="break-words font-extrabold">{item.name}</p><p className="mt-1 break-all text-sm text-stone-500">{item.email}</p></div><Labeled label={t('adminUsers.role')}><StatusPill tone={item.role === 'admin' ? 'violet' : item.role === 'teacher' ? 'warning' : 'neutral'}>{roleName(item.role)}</StatusPill></Labeled><Labeled label={t('adminUsers.status')}><StatusPill tone={item.is_active ? 'success' : 'danger'}>{t(item.is_active ? 'adminUsers.active' : 'adminUsers.inactive')}</StatusPill></Labeled><button type="button" onClick={() => setSelected(item)} className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 hover:bg-stone-100" aria-label={t('adminUsers.actions', { name: item.name })}><MoreHorizontal className="h-5 w-5" /></button></div>)}{!users.length && <p className="p-10 text-center text-stone-500">{t('adminUsers.empty')}</p>}</div></Card>}
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title={t('adminUsers.newUser')} description={t('adminUsers.createDescription')} footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('adminUsers.cancel')}</Button><Button loading={actionLoading} disabled={!form.name.trim() || !form.email.trim() || form.password.length < 8} onClick={createUser}>{t('adminUsers.create')}</Button></>}><UserFields form={form} setForm={setForm} includePassword t={t} /></Dialog>
    <Dialog open={Boolean(selected) && !resetOpen && !editor} onClose={() => setSelected(null)} title={selected?.name || ''} description={selected?.email || ''} footer={<Button variant="ghost" onClick={() => setSelected(null)}>{t('adminUsers.close')}</Button>}><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => setEditor({ ...selected })} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold"><Shield className="h-5 w-5 shrink-0 text-lavender-600" /> {t('adminUsers.profileRole')}</button><button onClick={() => setResetOpen(true)} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold"><KeyRound className="h-5 w-5 shrink-0" /> {t('adminUsers.changePassword')}</button><button onClick={toggleStatus} className={`flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left font-bold sm:col-span-2 ${selected?.is_active ? 'border-danger-200 text-danger-700' : 'border-mint-200 text-mint-700'}`}>{selected?.is_active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />} {t(selected?.is_active ? 'adminUsers.blockAccess' : 'adminUsers.restoreAccess')}</button></div></Dialog>
    <Dialog open={Boolean(editor)} onClose={() => setEditor(null)} title={t('adminUsers.editUser')} footer={<><Button variant="ghost" onClick={() => setEditor(null)}>{t('adminUsers.cancel')}</Button><Button loading={actionLoading} disabled={!editor?.name?.trim() || !editor?.email?.trim()} onClick={saveUser}>{t('adminUsers.save')}</Button></>}>{editor && <UserFields form={editor} setForm={setEditor} t={t} />}</Dialog>
    <Dialog open={resetOpen} onClose={() => { setResetOpen(false); setPassword(''); }} title={t('adminUsers.setPassword')} description={t('adminUsers.passwordDescription', { name: selected?.name || t('adminUsers.defaultUser') })} footer={<><Button variant="ghost" onClick={() => setResetOpen(false)}>{t('adminUsers.cancel')}</Button><Button loading={actionLoading} disabled={password.length < 8} onClick={resetPassword}>{t('adminUsers.setPassword')}</Button></>}><label className="field-label">{t('adminUsers.newPassword')}<input type="password" autoComplete="new-password" className="field-control mt-2" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} /></label><p className="mt-2 text-xs text-stone-500">{t('adminUsers.passwordHint')}</p></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}

function Labeled({ label, children }) { return <div><span className="mb-1 block text-xs text-stone-400 md:hidden">{label}</span>{children}</div>; }
function UserFields({ form, setForm, includePassword = false, t }) { return <div className="grid gap-4"><label className="field-label">{t('adminUsers.name')}<input className="field-control mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="field-label">Email<input type="email" autoComplete="email" className="field-control mt-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field-label">{t('adminUsers.role')}<select className="field-control mt-2" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{['student', 'teacher', 'admin'].map((value) => <option key={value} value={value}>{t(`roles.${value}`)}</option>)}</select></label>{includePassword && <label className="field-label">{t('adminUsers.temporaryPassword')}<input type="password" autoComplete="new-password" className="field-control mt-2" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}</div>; }
