import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { billingApi } from '../../features/billing/billingApi';
import { clearDemoPayment, demoPaymentKey, getPendingDemoPayment } from '../../features/billing/demoPaymentFlow';
import { useI18n } from '../../shared/i18n/i18n';
import { Button, Card } from '../../shared/ui';

export const DEMO_PROCESSING_DELAY_MS = 5000;

export function DemoCheckoutPage({ processingDelayMs = DEMO_PROCESSING_DELAY_MS }) {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [payment, setPayment] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const confirming = useRef(false);

  useEffect(() => {
    billingApi.payment(paymentId)
      .then(({ data }) => {
        setPayment(data.payment);
        if (data.payment.status === 'paid') {
          clearDemoPayment(paymentId);
          setPhase('success');
          return;
        }

        const openedKaspi = window.sessionStorage.getItem(demoPaymentKey(paymentId));
        const isPending = getPendingDemoPayment() === paymentId;
        if (!openedKaspi && !isPending) {
          setError(t('billing.demoSessionMissing'));
          setPhase('error');
          return;
        }
        setPhase('processing');
      })
      .catch(() => {
        setError(t('billing.demoLoadError'));
        setPhase('error');
      });
  }, [paymentId, t]);

  const finishDemo = useCallback(async () => {
    if (confirming.current) return;
    confirming.current = true;
    try {
      const response = await billingApi.confirmDemo(paymentId);
      setPayment(response.data.payment);
      clearDemoPayment(paymentId);
      setPhase('success');
    } catch (_error) {
      setError(t('billing.demoConfirmError'));
      setPhase('error');
    } finally {
      confirming.current = false;
    }
  }, [paymentId, t]);

  useEffect(() => {
    if (phase !== 'processing') return undefined;
    setProgress(0);
    const animationFrame = window.requestAnimationFrame(() => setProgress(100));
    const timer = window.setTimeout(finishDemo, processingDelayMs);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, [finishDemo, phase, processingDelayMs]);

  if (phase === 'success') {
    return (
      <div className="grid min-h-[calc(100dvh-10rem)] place-items-center py-6">
        <Card className="relative w-full max-w-xl overflow-hidden border-mint-200 p-6 text-center sm:p-10">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-mint-500 via-lime to-lavender-500" />
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-mint-100 text-mint-700"><CheckCircle2 className="h-10 w-10" /></span>
          <span className="mt-6 inline-flex rounded-full bg-warning-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-warning-700">{t('billing.demoBadge')}</span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{t('billing.welcomeTitle')}</h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{t('billing.welcomeText')}</p>
          <div className="mt-6 rounded-3xl bg-stone-50 p-5 text-left">
            <div className="flex justify-between gap-4"><span className="text-stone-500">{t('billing.plan')}</span><strong>{payment?.plan?.name?.[locale] || payment?.plan?.name?.ru || payment?.plan_id}</strong></div>
            <div className="mt-3 flex justify-between gap-4 border-t border-stone-200 pt-3"><span className="text-stone-500">{t('billing.demoCharge')}</span><strong>0 ₸</strong></div>
          </div>
          <Button className="mt-7 w-full" onClick={() => navigate('/student/dashboard')}>{t('billing.startLearning')}<ArrowRight className="h-5 w-5" /></Button>
          <p className="mt-5 text-xs font-semibold text-stone-500">{t('billing.demoSuccessDisclaimer')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-10rem)] place-items-center py-6">
      <Card className="w-full max-w-xl p-6 text-center sm:p-9">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-100 text-lavender-700">
          <LoaderCircle className={`h-8 w-8 ${phase === 'loading' || phase === 'processing' ? 'animate-spin' : ''}`} />
        </span>
        <p className="eyebrow mt-6">SANAQ DEMO</p>
        <h1 className="mt-3 text-3xl font-extrabold">{phase === 'error' ? t('billing.demoErrorTitle') : t('billing.processingTitle')}</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{phase === 'error' ? error : t('billing.processingText')}</p>

        {phase === 'processing' && (
          <div className="mt-7" role="status" aria-live="polite">
            <div className="h-3 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lavender-500 to-mint-500 transition-[width] ease-linear motion-reduce:transition-none"
                style={{ width: `${progress}%`, transitionDuration: `${processingDelayMs}ms` }}
              />
            </div>
            <p className="mt-3 text-sm font-extrabold text-lavender-700">{t('billing.processingStatus')}</p>
          </div>
        )}

        {phase === 'error' && <Button className="mt-7 w-full" variant="outline" onClick={() => navigate('/student/billing', { replace: true })}>{t('billing.backBilling')}</Button>}

        <div className="mt-6 flex items-start gap-2 rounded-2xl bg-warning-50 p-4 text-left text-xs font-semibold leading-5 text-warning-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('billing.notKaspi')}</span>
        </div>
      </Card>
    </div>
  );
}
