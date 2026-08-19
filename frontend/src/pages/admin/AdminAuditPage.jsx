import { useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader } from '../../features/admin/AdminPrimitives';
import { Card, Skeleton } from '../../shared/ui';

export function AdminAuditPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminApi.auditLog().then((response) => setItems(response.data.items || [])).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false)); }, []);
  const filtered = items.filter((item) => `${item.action} ${item.entity_type} ${item.entity_id || ''} ${item.actor_id}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="mx-auto max-w-7xl animate-rise"><AdminPageHeader eyebrow="Прозрачность изменений" title="Журнал действий" description="Кто и когда выполнял критические административные операции." />{error && <div className="state-error mt-6" role="alert">{error}</div>}<Card className="mt-7 p-4 sm:p-6"><label className="relative block"><span className="sr-only">Поиск по журналу</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input className="field-control pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Действие, объект или ID администратора" /></label></Card>{loading ? <Skeleton className="mt-5" lines={10} /> : <Card className="mt-5 overflow-hidden"><div className="divide-y divide-stone-200">{filtered.map((item) => <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[48px_minmax(0,1fr)_220px] md:items-center md:px-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><ShieldCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="break-words font-extrabold">{item.action}</p><p className="mt-1 break-all text-xs text-stone-500">{item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ''} · actor {item.actor_id}</p>{item.details && Object.keys(item.details).length > 0 && <pre className="mt-2 max-w-full overflow-x-auto rounded-xl bg-stone-100 p-3 text-xs">{JSON.stringify(item.details, null, 2)}</pre>}</div><time className="text-sm text-stone-500 md:text-right">{new Date(item.created_at).toLocaleString('ru-RU')}</time></div>)}{!filtered.length && <p className="p-10 text-center text-stone-500">Записи не найдены</p>}</div></Card>}</div>;
}
