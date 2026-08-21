import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, ProgressBar } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function DailyStepCard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return <section className="overflow-hidden rounded-4xl bg-ink text-white shadow-soft"><div className="grid lg:grid-cols-[1.15fr_0.85fr]"><div className="p-7 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ink"><Sparkles className="h-4 w-4" /> {t('dailyStep.badge')}</span><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.04em]">{t('dailyStep.title')}</h2><p className="mt-3 max-w-xl text-stone-400">{t('dailyStep.description')}</p><div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-300"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-lime" /> {t('dailyStep.minutes')}</span><span>{t('dailyStep.tasks')}</span></div><Button className="mt-7" onClick={() => navigate('/student/learn/factorization')}>{t('dailyStep.continue')} <ArrowRight className="h-5 w-5" /></Button></div><div className="flex flex-col justify-end bg-white/[0.07] p-7 sm:p-10"><p className="text-sm font-bold text-lime">{t('dailyStep.why')}</p><p className="mt-3 text-sm leading-7 text-stone-300">{t('dailyStep.reason')}</p><ProgressBar value={68} label={t('dailyStep.completed')} className="mt-7" tone="mint" /></div></div></section>;
}
