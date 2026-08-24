import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PlanCard } from '../../features/billing/PlanCard';
import { billingApi } from '../../features/billing/billingApi';
import { useI18n } from '../../shared/i18n/i18n';
import { Button, Card, StatusToast } from '../../shared/ui';

const idempotencyKey = () => window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function BillingPage() {
  const { t, locale } = useI18n();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [toast, setToast] = useState('');
  const requestedPlan = searchParams.get('plan');

  const load = async () => {
    const [plansResponse, subscriptionResponse] = await Promise.all([billingApi.plans(), billingApi.subscription()]);
    setPlans(plansResponse.data.items || []);
    setSubscription(subscriptionResponse.data.subscription || null);
  };
  useEffect(() => { load().catch(() => setToast(t('billing.loadError'))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => plans.find((item) => item.id === requestedPlan), [plans, requestedPlan]);
  const startPayment = async (plan) => {
    setLoadingPlan(plan.id);
    try {
      const response = await billingApi.createPayment(plan.id, idempotencyKey());
      setPayment(response.data.payment);
    } catch (error) {
      setToast(error.code === 'KASPI_NOT_CONFIGURED' ? t('billing.notConfigured') : t('billing.paymentError'));
    } finally { setLoadingPlan(''); }
  };
  useEffect(() => { if (selected && !payment) startPayment(selected); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPayment = async () => {
    if (!payment) return;
    const response = await billingApi.payment(payment.id);
    setPayment(response.data.payment);
    if (response.data.payment.status === 'paid') await load();
  };
  const copyReference = async () => { await navigator.clipboard.writeText(payment.provider_reference); setToast(t('billing.copied')); };

  return <div className="mx-auto max-w-6xl animate-rise pb-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('billing.eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('billing.cabinetTitle')}</h1><p className="mt-2 max-w-2xl text-stone-600">{t('billing.cabinetDescription')}</p></div>{subscription && <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-mint-100 px-4 py-3 text-sm font-extrabold text-mint-700"><CheckCircle2 className="h-5 w-5" />{t('billing.activeUntil', { date: new Date(subscription.expires_at).toLocaleDateString(locale) })}</span>}</div>
    <div className="mt-7 grid gap-5 md:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} locale={locale} loading={loadingPlan === plan.id} active={subscription?.plan_id === plan.id} onSelect={startPayment} label={{ recommended: t('billing.recommended'), period: t('billing.month'), select: t('billing.pay'), active: t('billing.extend') }} />)}</div>
    <Card className="mt-6 flex items-start gap-3 p-5 sm:p-6"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-700" /><div><p className="font-extrabold">{t('billing.safetyTitle')}</p><p className="mt-1 text-sm leading-6 text-stone-600">{t('billing.safetyText')}</p></div></Card>
    {payment && <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-paper p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#e53b35]">Kaspi Pay</p><h2 id="checkout-title" className="mt-2 text-2xl font-extrabold">{t('billing.checkoutTitle')}</h2></div><button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl hover:bg-stone-100" onClick={() => setPayment(null)} aria-label={t('billing.close')}><X /></button></div><div className="mt-6 rounded-3xl bg-stone-50 p-5"><div className="flex items-center justify-between gap-4"><span className="text-sm text-stone-500">{t('billing.amount')}</span><strong className="text-2xl">1 ₸</strong></div><div className="mt-4 border-t border-stone-200 pt-4"><span className="text-sm text-stone-500">{t('billing.reference')}</span><button className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-paper px-4 text-left font-extrabold" onClick={copyReference}><span className="truncate">{payment.provider_reference}</span><Copy className="h-4 w-4 shrink-0" /></button></div></div><p className="mt-5 text-sm leading-6 text-stone-600">{payment.provider_mode === 'demo' ? t('billing.demoNotice') : t('billing.kaspiInstructions')}</p><a href={payment.checkout_url} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#ce302b] bg-[#e53b35] px-5 font-extrabold text-white shadow-lg transition hover:bg-[#ce302b]">{payment.provider_mode === 'demo' ? t('billing.openDemo') : t('billing.openKaspi')}<ExternalLink className="h-5 w-5" /></a><Button className="mt-3 w-full" variant="outline" onClick={refreshPayment}><RefreshCw className="h-4 w-4" />{t('billing.checkStatus')}</Button><p aria-live="polite" className="mt-4 text-center text-xs text-stone-500">{payment.status === 'paid' ? t('billing.statusPaid') : t('billing.statusPending')}</p></div></div>}
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
