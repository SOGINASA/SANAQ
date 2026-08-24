import { useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, LockKeyhole } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { billingApi } from '../../features/billing/billingApi';
import { useI18n } from '../../shared/i18n/i18n';
import { Button, Card } from '../../shared/ui';

export function DemoCheckoutPage() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { billingApi.payment(paymentId).then(({ data }) => setPayment(data.payment)).finally(() => setLoading(false)); }, [paymentId]);
  const confirm = async () => { setLoading(true); const response = await billingApi.confirmDemo(paymentId); setPayment(response.data.payment); setLoading(false); };
  return <div className="grid min-h-[calc(100dvh-10rem)] place-items-center py-6"><Card className="w-full max-w-xl p-6 text-center sm:p-9"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-warning-100 text-warning-700"><FlaskConical className="h-7 w-7" /></span><p className="eyebrow mt-6">SANAQ DEMO</p><h1 className="mt-3 text-3xl font-extrabold">{t('billing.demoTitle')}</h1><p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">{t('billing.demoText')}</p>{payment && <div className="mt-6 rounded-3xl bg-stone-50 p-5 text-left"><div className="flex justify-between gap-4"><span>{t('billing.amount')}</span><strong>1 ₸</strong></div><div className="mt-3 flex justify-between gap-4 border-t border-stone-200 pt-3"><span>{t('billing.reference')}</span><strong className="break-all text-right">{payment.provider_reference}</strong></div></div>}{payment?.status === 'paid' ? <><p className="mt-6 inline-flex items-center gap-2 font-extrabold text-mint-700"><CheckCircle2 />{t('billing.statusPaid')}</p><Button className="mt-6 w-full" onClick={() => navigate('/student/billing')}>{t('billing.backBilling')}</Button></> : <Button className="mt-6 w-full" loading={loading} onClick={confirm}><LockKeyhole className="h-5 w-5" />{t('billing.confirmDemo')}</Button>}<p className="mt-5 text-xs font-semibold text-danger-700">{t('billing.notKaspi')}</p></Card></div>;
}
