import { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, BrainCircuit, Clock3, Database, RefreshCw, Server } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Skeleton } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function AdminSystemPage() {
  const { locale, t } = useI18n();
  const [ready, setReady] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [readyResponse, metaResponse, metricResponse] = await Promise.all([adminApi.readiness(), adminApi.metadata(), adminApi.pathnetMetrics()]);
      setReady(readyResponse.data);
      setMeta(metaResponse.data);
      setMetrics(metricResponse.data);
      setCheckedAt(new Date());
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const backendState = ready?.status === 'ready' ? 'success' : ready?.status === 'degraded' ? 'warning' : 'danger';
  const aiState = String(ready?.checks?.ai || '').startsWith('ok:') ? 'success' : 'danger';
  const pathnetState = String(ready?.checks?.pathnet || '').startsWith('ok:') ? 'success' : ready?.checks?.pathnet === 'disabled' ? 'warning' : 'danger';
  const config = [[t('adminSystem.apiVersion'), meta?.api_version], [t('adminSystem.dataMode'), meta?.data_mode], [t('adminSystem.aiProvider'), meta?.feature_flags?.ai_provider], [t('adminSystem.aiModel'), meta?.feature_flags?.ai_model], [t('adminSystem.languages'), meta?.supported_locales?.join(', ')]];

  const actions = <div className="flex flex-col items-end gap-2"><Button variant="outline" loading={loading} onClick={load}><RefreshCw className="h-4 w-4" /> {t('adminSystem.refresh')}</Button>{checkedAt && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500"><Clock3 className="h-3.5 w-3.5" />{t('adminSystem.check')} · {checkedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>}</div>;

  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow={t('adminSystem.eyebrow')} title={t('adminSystem.title')} description={t('adminSystem.description')} actions={actions} />
    {error && <div className="state-error mt-6" role="alert">{error}<div className="mt-3"><Button size="sm" variant="outline" onClick={load}>{t('adminRuntime.retry')}</Button></div></div>}
    {loading && !ready ? <Skeleton className="mt-7" lines={10} /> : <>
      <div className={`service-grid stagger-grid mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-70' : ''}`} aria-busy={loading}>
        <ServiceCard t={t} icon={Server} title="Backend API" value={ready?.status} state={backendState} />
        <ServiceCard t={t} icon={Database} title={t('adminSystem.database')} value={ready?.checks?.database} state={ready?.checks?.database === 'ok' ? 'success' : 'danger'} />
        <ServiceCard t={t} icon={Bot} title={t('adminSystem.aiProvider')} value={ready?.checks?.ai} state={aiState} />
        <ServiceCard t={t} icon={BrainCircuit} title="PathNet" value={ready?.checks?.pathnet} state={pathnetState} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-6 sm:p-8"><p className="eyebrow">{t('adminSystem.configuration')}</p><h2 className="mt-2 min-h-14 text-2xl font-extrabold">{t('adminSystem.capabilities')}</h2><div className="mt-5 divide-y divide-stone-200">{config.map(([label, value]) => <div key={label} className="data-row flex items-center justify-between gap-4 py-4"><span className="font-bold">{label}</span><span className="break-all text-right text-sm text-stone-500">{value || '—'}</span></div>)}</div></Card>
        <Card className="p-6 sm:p-8"><p className="eyebrow">PathNet</p><h2 className="mt-2 min-h-14 text-2xl font-extrabold">{t('adminSystem.shadowMetrics')}</h2><div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t('adminSystem.plans')} value={metrics?.scored_plans ?? '—'} /><Metric label={t('adminSystem.errors')} value={metrics?.failed_plans ?? '—'} /><Metric label="Overlap@K" value={metrics?.mean_overlap_at_k ?? '—'} /><Metric label={t('adminSystem.latency')} value={metrics?.mean_latency_ms != null ? t('adminSystem.milliseconds', { value: metrics.mean_latency_ms }) : '—'} /></div><p className="mt-5 break-words text-sm leading-6 text-stone-500">{t('adminSystem.versions', { value: metrics?.model_versions?.join(', ') || t('adminSystem.noVersions') })}</p></Card>
      </div>
    </>}
  </div>;
}

function ServiceCard({ t, icon: Icon, title, value, state }) {
  const tones = { success: 'bg-mint-100 text-mint-700', warning: 'bg-warning-100 text-warning-700', danger: 'bg-danger-100 text-danger-700' };
  const label = state === 'success' ? t('adminRuntime.working') : state === 'warning' ? t('adminRuntime.degraded') : t('adminRuntime.unavailableStatus');
  return <Card className={`service-node service-node--${state} p-5`}><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[state]}`}><Icon className="h-5 w-5" /></span><StatusPill tone={state}>{label}</StatusPill></div><h2 className="mt-5 font-extrabold">{title}</h2><p className="mt-1 min-h-10 break-all text-xs leading-5 text-stone-500">{String(value ?? t('adminSystem.noData'))}</p></Card>;
}
function Metric({ label, value }) { return <div className="rounded-2xl bg-stone-100 p-4"><Activity className="h-4 w-4 text-stone-400" /><strong className="mt-3 block text-xl tabular-nums">{value}</strong><span className="mt-1 text-xs text-stone-500">{label}</span></div>; }
