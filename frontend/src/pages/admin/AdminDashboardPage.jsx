import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowUpRight, BookOpenCheck, Bot, School, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Skeleton } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

const requiredCounts = ['users', 'students', 'teachers', 'active_users', 'classes', 'modules', 'published_modules', 'open_ai_reports', 'events'];
const isVerifiedDashboard = (payload) => Boolean(payload?.counts) && requiredCounts.every((key) => Number.isInteger(payload.counts[key]) && payload.counts[key] >= 0) && Array.isArray(payload?.recent_activity);

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [dashboardResult, readinessResult] = await Promise.allSettled([adminApi.dashboard(), adminApi.readiness()]);
    const errors = [];
    if (dashboardResult.status === 'fulfilled' && isVerifiedDashboard(dashboardResult.value.data)) setData(dashboardResult.value.data);
    else { setData(null); errors.push(dashboardResult.status === 'rejected' ? dashboardResult.reason.message : t('adminRuntime.dashboardInvalid')); }
    if (readinessResult.status === 'fulfilled') setReady(readinessResult.value.data);
    else { setReady(null); errors.push(t('adminRuntime.diagnosticError', { message: readinessResult.reason.message })); }
    setError(errors.join(' ')); setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);
  if (loading && !data) return <div className="mx-auto max-w-7xl"><Skeleton lines={5} /><Skeleton className="mt-6" lines={7} /></div>;
  if (!data) return <div className="mx-auto max-w-7xl animate-rise"><AdminPageHeader eyebrow={t('adminDashboard.eyebrow')} title={t('adminDashboard.title')} description={t('adminRuntime.unavailableDescription')} actions={<Button variant="outline" loading={loading} onClick={load}>{t('adminRuntime.retry')}</Button>} /><div className="state-error mt-6" role="alert">{error || t('adminRuntime.unavailable')}</div></div>;

  const counts = data.counts;
  const cards = [
    [Users, counts.users, t('adminDashboard.users'), t('adminDashboard.active', { count: counts.active_users }), 'bg-lavender-100 text-lavender-700', '/admin/users'],
    [School, counts.classes, t('adminDashboard.classes'), t('adminDashboard.teachers', { count: counts.teachers }), 'bg-mint-100 text-mint-700', '/admin/classes'],
    [BookOpenCheck, counts.modules, t('adminDashboard.modules'), t('adminDashboard.published', { count: counts.published_modules }), 'bg-amber-100 text-amber-800', '/admin/content'],
    [Bot, counts.open_ai_reports, t('adminDashboard.aiReports'), t('adminDashboard.needAttention'), 'bg-danger-100 text-danger-700', '/admin/moderation'],
  ];
  const readinessKey = ready?.status === 'ready' ? 'working' : ready?.status === 'degraded' ? 'degraded' : 'unavailableStatus';

  return <div className="mx-auto max-w-7xl animate-rise">
    <AdminPageHeader eyebrow={t('adminDashboard.eyebrow')} title={t('adminDashboard.title')} description={t('adminDashboard.description')} actions={<Button onClick={() => navigate('/admin/users')}>{t('adminDashboard.manageUsers')}</Button>} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 xl:grid-cols-4">{cards.map(([Icon, value, label, detail, tone, path]) => <Card as="button" type="button" key={label} onClick={() => navigate(path)} aria-label={t('adminDashboard.openMetric', { label })} className="group flex min-h-[148px] cursor-pointer flex-col p-4 text-left transition active:scale-[0.98] sm:min-h-0 sm:p-5"><span className="flex items-start justify-between gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${tone}`}><Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" /></span><ArrowUpRight className="h-4 w-4 text-stone-300 transition group-hover:text-lavender-600 sm:h-5 sm:w-5" /></span><span className="mt-auto block pt-4 sm:pt-5"><span className="block font-display text-2xl font-semibold leading-none tabular-nums sm:text-3xl">{value}</span><span className="mt-2 block break-words text-sm font-extrabold leading-[1.2] sm:text-base">{label}</span><span className="mt-1.5 block break-words text-[11px] leading-4 text-stone-500 sm:text-sm">{detail}</span></span></Card>)}</div>
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-paper px-4 py-3 text-sm text-stone-600 sm:hidden"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lavender-100 text-lavender-700"><ArrowDown className="h-4 w-4" /></span><span className="font-semibold">{t('adminDashboard.moreBelow')}</span></div>
    <div className="mt-5 grid gap-5 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="eyebrow">{t('adminDashboard.changeControl')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('adminDashboard.latest')}</h2></div><button className="min-h-11 self-start rounded-xl px-3 text-sm font-bold text-lavender-700" onClick={() => navigate('/admin/audit')}>{t('adminDashboard.fullLog')}</button></div><div className="mt-5 divide-y divide-stone-200">{data.recent_activity.map((item) => { const key = `adminDashboard.activities.${item.action}`; const translated = t(key); return <div key={item.id} className="flex min-w-0 items-start gap-3 py-4"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500"><ShieldCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="break-words font-bold">{translated === key ? item.action : translated}</p><p className="mt-1 break-all text-xs text-stone-500">{item.entity_type}{item.entity_id ? ` · ${item.entity_id}` : ''}</p></div><time className="shrink-0 text-xs text-stone-400">{new Date(item.created_at).toLocaleDateString(locale)}</time></div>; })}{!data.recent_activity.length && <p className="py-8 text-center text-stone-500">{t('adminDashboard.noActivity')}</p>}</div></Card>
      <Card className="p-5 sm:p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-100 text-mint-700"><Activity className="h-6 w-6" /></span><h2 className="mt-5 text-xl font-extrabold">{t('adminDashboard.services')}</h2><p className="mt-2 text-sm leading-6 text-stone-500">{t('adminDashboard.servicesText')}</p><div className="mt-5 grid gap-3"><div className="flex items-center justify-between rounded-2xl bg-stone-100 p-4"><span className="font-bold">Backend</span><StatusPill tone={ready?.status === 'ready' ? 'success' : ready?.status === 'degraded' ? 'warning' : 'danger'}>{t(`adminRuntime.${readinessKey}`)}</StatusPill></div>{Object.entries(ready?.checks || {}).map(([name, value]) => <div key={name} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 p-4"><span className="font-bold capitalize">{name}</span><span className="break-all text-right text-xs text-stone-500">{value}</span></div>)}</div><Button variant="outline" className="mt-5 w-full" onClick={() => navigate('/admin/system')}>{t('adminDashboard.diagnostics')}</Button></Card>
    </div>
  </div>;
}
