import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlanCard } from '../../features/billing/PlanCard';
import { billingApi } from '../../features/billing/billingApi';
import { getPendingDemoPayment, openKaspiApp, rememberDemoPayment } from '../../features/billing/demoPaymentFlow';
import { useI18n } from '../../shared/i18n/i18n';
import { Card, StatusToast } from '../../shared/ui';

const idempotencyKey = () => window.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function BillingPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [toast, setToast] = useState('');
  const autoRequestedPlan = useRef('');
  const requestedPlan = searchParams.get('plan');

  const load = async () => {
    const [plansResponse, subscriptionResponse] = await Promise.all([billingApi.plans(), billingApi.subscription()]);
    setPlans(plansResponse.data.items || []);
    setSubscription(subscriptionResponse.data.subscription || null);
  };
  useEffect(() => { load().catch(() => setToast(t('billing.loadError'))); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const resumeDemo = () => {
      const pendingPaymentId = getPendingDemoPayment();
      if (pendingPaymentId && document.visibilityState === 'visible') {
        navigate(`/student/billing/demo/${pendingPaymentId}`, { replace: true });
      }
    };
    resumeDemo();
    window.addEventListener('focus', resumeDemo);
    window.addEventListener('pageshow', resumeDemo);
    document.addEventListener('visibilitychange', resumeDemo);
    return () => {
      window.removeEventListener('focus', resumeDemo);
      window.removeEventListener('pageshow', resumeDemo);
      document.removeEventListener('visibilitychange', resumeDemo);
    };
  }, [navigate]);

  const selected = useMemo(() => plans.find((item) => item.id === requestedPlan), [plans, requestedPlan]);
  const startPayment = async (plan) => {
    setLoadingPlan(plan.id);
    try {
      const response = await billingApi.createPayment(plan.id, idempotencyKey());
      const createdPayment = response.data.payment;
      if (createdPayment.provider_mode === 'demo') {
        rememberDemoPayment(createdPayment.id);
        openKaspiApp();
        return;
      }
    } catch (error) {
      setToast(t('billing.paymentError'));
    } finally { setLoadingPlan(''); }
  };
  useEffect(() => {
    if (selected && !getPendingDemoPayment() && autoRequestedPlan.current !== selected.id) {
      autoRequestedPlan.current = selected.id;
      startPayment(selected);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="mx-auto max-w-6xl animate-rise pb-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{t('billing.eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('billing.cabinetTitle')}</h1><p className="mt-2 max-w-2xl text-stone-600">{t('billing.cabinetDescription')}</p></div>{subscription && <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-mint-100 px-4 py-3 text-sm font-extrabold text-mint-700"><CheckCircle2 className="h-5 w-5" />{t('billing.activeUntil', { date: new Date(subscription.expires_at).toLocaleDateString(locale) })}</span>}</div>
    <div className="mt-7 grid gap-5 md:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} locale={locale} loading={loadingPlan === plan.id} active={subscription?.plan_id === plan.id} onSelect={startPayment} label={{ recommended: t('billing.recommended'), period: t('billing.month'), select: t('billing.pay'), active: t('billing.extend') }} />)}</div>
    <Card className="mt-6 flex items-start gap-3 p-5 sm:p-6"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-700" /><div><p className="font-extrabold">{t('billing.safetyTitle')}</p><p className="mt-1 text-sm leading-6 text-stone-600">{t('billing.safetyText')}</p></div></Card>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
