import { useEffect, useState } from 'react';
import { Check, CreditCard, RefreshCw, X } from 'lucide-react';
import { billingApi } from '../../features/billing/billingApi';
import { useI18n } from '../../shared/i18n/i18n';
import { Button, Card, StatusToast } from '../../shared/ui';

export function AdminBillingPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const load = async () => { setLoading(true); try { const response = await billingApi.adminPayments(status); setItems(response.data.items || []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (id, action) => { setBusy(id); try { action === 'confirm' ? await billingApi.adminConfirm(id) : await billingApi.adminCancel(id); setToast(action === 'confirm' ? t('adminBilling.confirmed') : t('adminBilling.cancelled')); await load(); } finally { setBusy(''); } };

  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('adminBilling.eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('adminBilling.title')}</h1><p className="mt-2 max-w-2xl text-stone-600">{t('adminBilling.description')}</p></div><Button variant="outline" onClick={load} loading={loading}><RefreshCw className="h-4 w-4" />{t('adminBilling.refresh')}</Button></div>
    <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist">{['pending', 'paid', 'cancelled', ''].map((value) => <button key={value || 'all'} role="tab" aria-selected={status === value} onClick={() => setStatus(value)} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-extrabold ${status === value ? 'bg-ink text-white' : 'border border-stone-200 bg-paper text-stone-600'}`}>{t(`adminBilling.tabs.${value || 'all'}`)}</button>)}</div>
    <div className="mt-4 grid gap-3">{items.map((payment) => <Card key={payment.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><CreditCard className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{payment.user?.name || '—'}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${payment.status === 'paid' ? 'bg-mint-100 text-mint-700' : payment.status === 'cancelled' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>{t(`adminBilling.status.${payment.status}`)}</span></div><p className="mt-1 truncate text-sm text-stone-500">{payment.user?.email}</p><p className="mt-2 break-all font-mono text-xs font-bold text-stone-700">{payment.provider_reference}</p></div></div><div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:items-center"><div><span className="block text-xs text-stone-500">{t('adminBilling.plan')}</span><strong>{payment.plan?.name?.[locale] || payment.plan_id}</strong></div><div><span className="block text-xs text-stone-500">{t('adminBilling.amount')}</span><strong>1 ₸</strong></div></div>{payment.status === 'pending' && <div className="flex gap-2"><Button size="sm" className="flex-1" loading={busy === payment.id} onClick={() => act(payment.id, 'confirm')}><Check className="h-4 w-4" />{t('adminBilling.confirm')}</Button><Button size="sm" variant="outline" className="flex-1" disabled={busy === payment.id} onClick={() => act(payment.id, 'cancel')}><X className="h-4 w-4" />{t('adminBilling.cancel')}</Button></div>}</div></Card>)}</div>
    {!loading && !items.length && <Card className="mt-4 p-10 text-center"><CreditCard className="mx-auto h-8 w-8 text-stone-400" /><p className="mt-4 font-extrabold">{t('adminBilling.empty')}</p></Card>}
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
