import { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, BrainCircuit, Database, RefreshCw, Server } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Skeleton } from '../../shared/ui';

export function AdminSystemPage() {
  const [ready, setReady] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [readyResponse, metaResponse, metricResponse] = await Promise.all([adminApi.readiness(), adminApi.metadata(), adminApi.pathnetMetrics()]); setReady(readyResponse.data); setMeta(metaResponse.data); setMetrics(metricResponse.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <div className="mx-auto max-w-7xl animate-rise"><AdminPageHeader eyebrow="Технический контроль" title="Система и AI" description="Фактическое состояние backend, базы, Qwen-провайдера и PathNet." actions={<Button variant="outline" loading={loading} onClick={load}><RefreshCw className="h-4 w-4" /> Обновить</Button>} />{error && <div className="state-error mt-6" role="alert">{error}</div>}{loading && !ready ? <Skeleton className="mt-7" lines={10} /> : <><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><ServiceCard icon={Server} title="Backend API" value={ready?.status} healthy={ready?.status === 'ready'} /><ServiceCard icon={Database} title="База данных" value={ready?.checks?.database} healthy={ready?.checks?.database === 'ok'} /><ServiceCard icon={Bot} title="AI-провайдер" value={ready?.checks?.ai} healthy={!String(ready?.checks?.ai).includes('error')} /><ServiceCard icon={BrainCircuit} title="PathNet" value={ready?.checks?.pathnet} healthy={!String(ready?.checks?.pathnet).includes('error')} /></div><div className="mt-6 grid gap-6 xl:grid-cols-2"><Card className="p-6 sm:p-8"><p className="eyebrow">Конфигурация</p><h2 className="mt-2 text-2xl font-extrabold">API и возможности</h2><div className="mt-5 divide-y divide-stone-200">{[['Версия API', meta?.api_version], ['Режим данных', meta?.data_mode], ['AI-провайдер', meta?.feature_flags?.ai_provider], ['AI-модель', meta?.feature_flags?.ai_model], ['Языки', meta?.supported_locales?.join(', ')]].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-4"><span className="font-bold">{label}</span><span className="break-all text-right text-sm text-stone-500">{value || '—'}</span></div>)}</div></Card><Card className="p-6 sm:p-8"><p className="eyebrow">PathNet</p><h2 className="mt-2 text-2xl font-extrabold">Shadow-метрики</h2><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="Планов" value={metrics?.scored_plans ?? 0} /><Metric label="Ошибок" value={metrics?.failed_plans ?? 0} /><Metric label="Overlap@K" value={metrics?.mean_overlap_at_k ?? '—'} /><Metric label="Задержка" value={metrics?.mean_latency_ms != null ? `${metrics.mean_latency_ms} мс` : '—'} /></div><p className="mt-5 break-words text-sm leading-6 text-stone-500">Версии: {metrics?.model_versions?.join(', ') || 'данных пока нет'}</p></Card></div></>}</div>;
}

function ServiceCard({ icon: Icon, title, value, healthy }) { return <Card className="p-5"><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${healthy ? 'bg-mint-100 text-mint-700' : 'bg-danger-100 text-danger-700'}`}><Icon className="h-5 w-5" /></span><StatusPill tone={healthy ? 'success' : 'danger'}>{healthy ? 'Работает' : 'Проверить'}</StatusPill></div><h2 className="mt-5 font-extrabold">{title}</h2><p className="mt-1 break-all text-xs leading-5 text-stone-500">{String(value || 'Нет данных')}</p></Card>; }
function Metric({ label, value }) { return <div className="rounded-2xl bg-stone-100 p-4"><Activity className="h-4 w-4 text-stone-400" /><strong className="mt-3 block text-xl tabular-nums">{value}</strong><span className="mt-1 text-xs text-stone-500">{label}</span></div>; }
