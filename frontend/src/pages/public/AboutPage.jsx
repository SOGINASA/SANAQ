import { ArrowRight, BrainCircuit, Eye, RefreshCw, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function AboutPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const items = [
    { icon: BrainCircuit, title: t('about.startTitle'), text: t('about.startText') },
    { icon: Route, title: t('about.routeTitle'), text: t('about.routeText') },
    { icon: Eye, title: t('about.explainTitle'), text: t('about.explainText') },
    { icon: RefreshCw, title: t('about.adaptTitle'), text: t('about.adaptText') },
  ];
  return (
    <section className="py-16 sm:py-24"><div className="page-container">
      <div className="max-w-3xl"><p className="eyebrow">{t('about.eyebrow')}</p><h1 className="page-title mt-4">{t('about.title')}</h1><p className="mt-6 text-lg leading-8 text-stone-600">{t('about.description')}</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">{items.map(({ icon: Icon, title, text }, index) => <Card key={title} className="p-7 sm:p-9"><span className="font-display text-sm text-lavender-500">0{index + 1}</span><Icon className="mt-8 h-8 w-8 text-lavender-600" /><h2 className="mt-4 text-2xl font-extrabold">{title}</h2><p className="mt-3 max-w-xl text-stone-600">{text}</p></Card>)}</div>
      <div className="mt-12 rounded-4xl bg-ink p-8 text-white sm:p-12"><h2 className="font-display text-3xl font-semibold">{t('about.ctaTitle')}</h2><p className="mt-3 max-w-xl text-stone-400">{t('about.ctaText')}</p><Button className="mt-7" onClick={() => navigate('/student/onboarding')}>{t('about.cta')} <ArrowRight className="h-5 w-5" /></Button></div>
    </div></section>
  );
}
