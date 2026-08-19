import { useCallback, useEffect, useState } from 'react';
import { KeyRound, MoreHorizontal, Plus, Search, Shield, UserCheck, UserX } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast } from '../../shared/ui';

const emptyUser = { name: '', email: '', password: '', role: 'student' };
const roleNames = { student: 'Ученик', teacher: 'Учитель', admin: 'Администратор' };
const PAGE_SIZE = 20;

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError('');
    try {
      const response = await adminApi.users({ search, role, page: requestedPage, pageSize: PAGE_SIZE });
      if (!Array.isArray(response.data.items) || !Number.isInteger(response.data.total)) throw new Error('Backend вернул некорректный список пользователей');
      setUsers(response.data.items); setTotal(response.data.total);
    }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [page, role, search]);
  useEffect(() => { const timeout = window.setTimeout(load, 250); return () => window.clearTimeout(timeout); }, [load]);

  const createUser = async () => {
    setActionLoading(true); setError('');
    try { await adminApi.createUser(form); setCreateOpen(false); setForm(emptyUser); setToast('Пользователь создан'); setPage(1); await load(1); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const saveUser = async () => {
    setActionLoading(true); setError('');
    try {
      await adminApi.updateUser(editor.id, { name: editor.name, email: editor.email });
      await adminApi.updateUserStatus(editor.id, { role: editor.role });
      setEditor(null); setSelected(null); setToast('Изменения сохранены'); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const toggleStatus = async () => {
    setActionLoading(true); setError('');
    try { await adminApi.updateUserStatus(selected.id, { is_active: !selected.is_active }); setToast(selected.is_active ? 'Пользователь заблокирован' : 'Доступ восстановлен'); setSelected(null); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const resetPassword = async () => {
    setActionLoading(true); setError('');
    try { await adminApi.resetPassword(selected.id, password); setResetOpen(false); setSelected(null); setPassword(''); setToast('Новый пароль установлен'); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow="Доступ и роли" title="Пользователи" description="Создавайте аккаунты, меняйте роли, восстанавливайте доступ и блокируйте учётные записи." actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> Новый пользователь</Button>} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <Card className="mt-7 p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative block flex-1"><span className="sr-only">Поиск</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input className="field-control pl-11" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Имя или email" /></label><label><span className="sr-only">Роль</span><select className="field-control sm:w-52" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">Все роли</option><option value="student">Ученики</option><option value="teacher">Учителя</option><option value="admin">Администраторы</option></select></label></div><p className="mt-3 text-sm text-stone-500">Найдено: {total}</p></Card>
    {loading && !users.length ? <Skeleton className="mt-5" lines={9} /> : <Card className="mt-5 overflow-hidden"><div className="hidden grid-cols-[minmax(0,1.3fr)_180px_140px_64px] gap-4 border-b border-stone-200 bg-stone-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 md:grid"><span>Пользователь</span><span>Роль</span><span>Статус</span><span /></div><div className="divide-y divide-stone-200">{users.map((item) => <div key={item.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.3fr)_180px_140px_64px] md:items-center md:px-6"><div className="min-w-0"><p className="break-words font-extrabold">{item.name}</p><p className="mt-1 break-all text-sm text-stone-500">{item.email}</p></div><div><span className="mb-1 block text-xs text-stone-400 md:hidden">Роль</span><StatusPill tone={item.role === 'admin' ? 'violet' : item.role === 'teacher' ? 'warning' : 'neutral'}>{roleNames[item.role]}</StatusPill></div><div><span className="mb-1 block text-xs text-stone-400 md:hidden">Статус</span><StatusPill tone={item.is_active ? 'success' : 'danger'}>{item.is_active ? 'Активен' : 'Заблокирован'}</StatusPill></div><button type="button" onClick={() => setSelected(item)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-stone-200 hover:bg-stone-100" aria-label={`Действия с ${item.name}`}><MoreHorizontal className="h-5 w-5" /></button></div>)}{!users.length && <p className="p-10 text-center text-stone-500">Пользователи не найдены</p>}</div>{total > PAGE_SIZE && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-4"><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Назад</Button><span className="text-sm font-bold text-stone-600">Страница {page} из {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Далее</Button></div>}</Card>}

    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Новый пользователь" description="Аккаунт будет активен сразу после создания." footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Отмена</Button><Button loading={actionLoading} disabled={!form.name.trim() || !form.email.trim() || form.password.length < 8} onClick={createUser}>Создать</Button></>}><UserFields form={form} setForm={setForm} includePassword /></Dialog>
    <Dialog open={Boolean(selected) && !resetOpen && !editor} onClose={() => setSelected(null)} title={selected?.name || ''} description={selected?.email || ''} footer={<Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button>}><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => setEditor({ ...selected })} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-lavender-50"><Shield className="h-5 w-5 text-lavender-600" /> Профиль и роль</button><button onClick={() => setResetOpen(true)} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-stone-100"><KeyRound className="h-5 w-5" /> Сменить пароль</button><button onClick={toggleStatus} className={`flex min-h-20 items-center gap-4 rounded-2xl border p-4 text-left font-bold sm:col-span-2 ${selected?.is_active ? 'border-danger-200 text-danger-700 hover:bg-danger-100' : 'border-mint-200 text-mint-700 hover:bg-mint-100'}`}>{selected?.is_active ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />} {selected?.is_active ? 'Заблокировать доступ' : 'Восстановить доступ'}</button></div></Dialog>
    <Dialog open={Boolean(editor)} onClose={() => setEditor(null)} title="Изменить пользователя" footer={<><Button variant="ghost" onClick={() => setEditor(null)}>Отмена</Button><Button loading={actionLoading} disabled={!editor?.name?.trim() || !editor?.email?.trim()} onClick={saveUser}>Сохранить</Button></>}>{editor && <UserFields form={editor} setForm={setEditor} />}</Dialog>
    <Dialog open={resetOpen} onClose={() => { setResetOpen(false); setPassword(''); }} title="Установить новый пароль" description={`Для ${selected?.name || 'пользователя'}. Старый пароль перестанет работать.`} footer={<><Button variant="ghost" onClick={() => setResetOpen(false)}>Отмена</Button><Button loading={actionLoading} disabled={password.length < 8} onClick={resetPassword}>Установить пароль</Button></>}><label className="field-label">Новый пароль<input type="password" autoComplete="new-password" className="field-control mt-2" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} /></label><p className="mt-2 text-xs text-stone-500">Минимум 8 символов.</p></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}

function UserFields({ form, setForm, includePassword = false }) {
  return <div className="grid gap-4"><label className="field-label">Имя<input className="field-control mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="field-label">Email<input type="email" autoComplete="email" className="field-control mt-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field-label">Роль<select className="field-control mt-2" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="student">Ученик</option><option value="teacher">Учитель</option><option value="admin">Администратор</option></select></label>{includePassword && <label className="field-label">Временный пароль<input type="password" autoComplete="new-password" className="field-control mt-2" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}</div>;
}
