import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlanCard } from '../../features/billing/PlanCard';
import { billingApi } from '../../features/billing/billingApi';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';
import { Button } from '../../shared/ui';

export function PricingPage() {
  const { t, locale } = useI18n();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => { billingApi.plans().then(({ data }) => setPlans(data.items || [])).catch(() => setError(true)); }, []);
  const select = (plan) => navigate(user?.role === 'student' ? `/student/billing?plan=${plan.id}` : `/login?next=${encodeURIComponent(`/student/billing?plan=${plan.id}`)}`);

  return <div className="pb-20 pt-12 sm:pt-16">
    <section className="page-container text-center"><span className="eyebrow">{t('billing.eyebrow')}</span><h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{t('billing.title')}</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">{t('billing.description')}</p><div className="mx-auto mt-6 inline-flex max-w-full items-center gap-2 rounded-2xl bg-warning-50 px-4 py-3 text-left text-sm font-bold text-warning-700"><ShieldCheck className="h-5 w-5 shrink-0" />{t('billing.symbolic')}</div></section>
    <section className="page-container mt-10"><div className="grid gap-5 md:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} locale={locale} onSelect={select} label={{ recommended: t('billing.recommended'), period: t('billing.month'), select: t('billing.choose'), active: t('billing.current') }} />)}</div>{error && <div className="rounded-3xl border border-danger-200 bg-danger-50 p-6 text-center"><p className="font-bold text-danger-700">{t('billing.loadError')}</p><Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>{t('common.retry')} <ArrowRight className="h-4 w-4" /></Button></div>}</section>
  </div>;
}
