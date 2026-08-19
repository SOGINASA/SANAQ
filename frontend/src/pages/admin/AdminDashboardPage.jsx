import { useEffect, useState } from 'react';
import { Activity, BookOpenCheck, Bot, School, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Skeleton } from '../../shared/ui';

const activityNames = {
  'user.created': 'Создан пользователь', 'user.updated': 'Изменён пользователь',
  'user.status_updated': 'Изменены права пользователя', 'user.password_reset': 'Сброшен пароль',
  'class.updated': 'Изменён класс', 'class.deleted': 'Удалён класс',
  'content.approved': 'Материал опубликован', 'content.rejected': 'Материал отклонён',
  'ai_report.updated': 'Обработана жалоба на AI',
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.readiness()])
      .then(([dashboard, readiness]) => { setData(dashboard.data); setReady(readiness.data); })
      .catch((requestError) => setError(requestError.message));
  }, []);
  if (!data && !error) return <div className="mx-auto max-w-7xl"><Skeleton lines={5} /><Skeleton className="mt-6" lines={7} /></div>;
  const counts = data?.counts || {};
  const cards = [
    [Users, counts.users || 0, 'Пользователей', `${counts.active_users || 0} активны`, 'bg-lavender-100 text-lavender-700'],
    [School, counts.classes || 0, 'Классов', `${counts.teachers || 0} учителей`, 'bg-mint-100 text-mint-700'],
    [BookOpenCheck, counts.modules || 0, 'Учебных модулей', `${counts.published_modules || 0} опубликованы`, 'bg-amber-100 text-amber-800'],
    [Bot, counts.open_ai_reports || 0, 'Жалоб на AI', 'требуют внимания', 'bg-danger-100 text-danger-700'],
  ];
  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow="Центр управления" title="Состояние SANAQ" description="Основные процессы платформы, требующие внимания администратора." actions={<Button onClick={() => navigate('/admin/users')}>Управлять пользователями</Button>} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([Icon, value, label, detail, tone]) => <Card key={label} className="p-5"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></span><p className="mt-5 font-display text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 font-bold">{label}</p><p className="mt-1 text-sm text-stone-500">{detail}</p></Card>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="eyebrow">Контроль изменений</p><h2 className="mt-2 text-2xl font-extrabold">Последние действия</h2></div><button className="min-h-11 rounded-xl px-3 text-sm font-bold text-lavender-700" onClick={() => navigate('/admin/audit')}>Весь журнал</button></div><div className="mt-5 divide-y divide-stone-200">{(data?.recent_activity || []).map((item) => <div key={item.id} className="flex items-start gap-3 py-4"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="break-words font-bold">{activityNames[item.action] || item.action}</p><p className="mt-1 break-all text-xs text-stone-500">{item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ''}</p></div><time className="shrink-0 text-xs text-stone-400">{new Date(item.created_at).toLocaleDateString('ru-RU')}</time></div>)}{!data?.recent_activity?.length && <p className="py-8 text-center text-stone-500">Действий пока нет</p>}</div></Card>
      <Card className="p-5 sm:p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-100 text-mint-700"><Activity className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-extrabold">Сервисы платформы</h2><p className="mt-2 text-sm leading-6 text-stone-500">Проверка доступности backend, базы данных, AI и планировщика.</p><div className="mt-5 grid gap-3"><div className="flex items-center justify-between rounded-2xl bg-stone-100 p-4"><span className="font-bold">Backend</span><StatusPill tone={ready?.status === 'ready' ? 'success' : 'danger'}>{ready?.status === 'ready' ? 'Работает' : 'Ошибка'}</StatusPill></div>{Object.entries(ready?.checks || {}).map(([name, value]) => <div key={name} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 p-4"><span className="font-bold capitalize">{name}</span><span className="break-all text-right text-xs text-stone-500">{value}</span></div>)}</div><Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/admin/system')}>Открыть диагностику</Button></Card>
    </div>
  </div>;
}
