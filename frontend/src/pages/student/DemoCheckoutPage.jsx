import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ExternalLink, FlaskConical, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { billingApi } from '../../features/billing/billingApi';
import { useI18n } from '../../shared/i18n/i18n';
import { Button, Card } from '../../shared/ui';

const KASPI_HOME_URL = 'https://kaspi.kz/';

export function DemoCheckoutPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [payment, setPayment] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState('');
  const leftPage = useRef(false);
  const confirming = useRef(false);
  const demoKey = `sanaq-demo-kaspi-${paymentId}`;

  useEffect(() => {
    billingApi.payment(paymentId)
      .then(({ data }) => {
        setPayment(data.payment);
        setPhase(data.payment.status === 'paid' ? 'success' : window.sessionStorage.getItem(demoKey) ? 'waiting' : 'ready');
      })
      .catch(() => { setError(t('billing.demoLoadError')); setPhase('error'); });
  }, [demoKey, paymentId, t]);

  const finishDemo = useCallback(async () => {
    if (confirming.current || phase === 'success') return;
    confirming.current = true;
    setPhase('confirming');
    try {
      const response = await billingApi.confirmDemo(paymentId);
      setPayment(response.data.payment);
      window.sessionStorage.removeItem(demoKey);
      setPhase('success');
    } catch (_error) {
      setError(t('billing.demoConfirmError'));
      setPhase('waiting');
    } finally {
      confirming.current = false;
    }
  }, [demoKey, paymentId, phase, t]);

  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const markLeft = () => { leftPage.current = true; };
    const continueAfterReturn = () => {
      if (document.visibilityState === 'visible' && leftPage.current) finishDemo();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') markLeft();
      else continueAfterReturn();
    };
    window.addEventListener('blur', markLeft);
    window.addEventListener('focus', continueAfterReturn);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', markLeft);
      window.removeEventListener('focus', continueAfterReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [finishDemo, phase]);

  const openKaspi = () => {
    window.sessionStorage.setItem(demoKey, 'opened');
    leftPage.current = false;
    setPhase('waiting');
    window.open(KASPI_HOME_URL, '_blank', 'noopener,noreferrer');
  };

  if (phase === 'success') return <div className="grid min-h-[calc(100dvh-10rem)] place-items-center py-6"><Card className="relative w-full max-w-xl overflow-hidden border-mint-200 p-6 text-center sm:p-10"><div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-mint-500 via-lime to-lavender-500" /><span className="mx-auto grid h-20 w-20 place-items-center rounded-[1.75rem] bg-mint-100 text-mint-700"><CheckCircle2 className="h-10 w-10" /></span><span className="mt-6 inline-flex rounded-full bg-warning-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-warning-700">{t('billing.demoBadge')}</span><h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">{t('billing.welcomeTitle')}</h1><p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{t('billing.welcomeText')}</p><div className="mt-6 rounded-3xl bg-stone-50 p-5 text-left"><div className="flex justify-between gap-4"><span className="text-stone-500">{t('billing.plan')}</span><strong>{payment?.plan?.name?.ru || payment?.plan_id}</strong></div><div className="mt-3 flex justify-between gap-4 border-t border-stone-200 pt-3"><span className="text-stone-500">{t('billing.demoCharge')}</span><strong>0 ₸</strong></div></div><Button className="mt-7 w-full" onClick={() => navigate('/student/dashboard')}>{t('billing.startLearning')}<ArrowRight className="h-5 w-5" /></Button><p className="mt-5 text-xs font-semibold text-stone-500">{t('billing.demoSuccessDisclaimer')}</p></Card></div>;

  return <div className="grid min-h-[calc(100dvh-10rem)] place-items-center py-6"><Card className="w-full max-w-xl p-6 text-center sm:p-9"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-warning-100 text-warning-700">{phase === 'confirming' || phase === 'loading' ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <FlaskConical className="h-7 w-7" />}</span><p className="eyebrow mt-6">SANAQ DEMO</p><h1 className="mt-3 text-3xl font-extrabold">{phase === 'waiting' || phase === 'confirming' ? t('billing.returnTitle') : t('billing.demoTitle')}</h1><p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{phase === 'waiting' || phase === 'confirming' ? t('billing.returnText') : t('billing.demoText')}</p>{payment && <div className="mt-6 rounded-3xl bg-stone-50 p-5 text-left"><div className="flex justify-between gap-4"><span>{t('billing.amount')}</span><strong>1 ₸</strong></div><div className="mt-3 flex justify-between gap-4 border-t border-stone-200 pt-3"><span>{t('billing.reference')}</span><strong className="break-all text-right">{payment.provider_reference}</strong></div></div>}{phase === 'ready' && <button type="button" onClick={openKaspi} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#ce302b] bg-[#e53b35] px-5 font-extrabold text-white shadow-lg transition hover:bg-[#ce302b]">{t('billing.openKaspiDemo')}<ExternalLink className="h-5 w-5" /></button>}{phase === 'waiting' && <Button className="mt-6 w-full" onClick={finishDemo}>{t('billing.returnedFromKaspi')}<ArrowRight className="h-5 w-5" /></Button>}{phase === 'confirming' && <p className="mt-6 font-extrabold text-lavender-700" role="status" aria-live="polite">{t('billing.finishingDemo')}</p>}{phase === 'error' && <Button className="mt-6 w-full" variant="outline" onClick={() => window.location.reload()}>{t('common.retry')}</Button>}{error && <p className="mt-4 text-sm font-bold text-danger-700" role="alert">{error}</p>}<div className="mt-5 flex items-start gap-2 rounded-2xl bg-warning-50 p-4 text-left text-xs font-semibold leading-5 text-warning-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('billing.notKaspi')}</span></div></Card></div>;
}
