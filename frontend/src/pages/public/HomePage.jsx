import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Check, Languages, Map, MessageCircleQuestion, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button, Card, Reveal } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';
import { useI18n } from '../../shared/i18n/i18n';

const features = [
  { icon: BrainCircuit, key: 'diagnostic', tone: 'bg-lavender-100 text-lavender-700' },
  { icon: Map, key: 'map', tone: 'bg-mint-100 text-mint-700' },
  { icon: MessageCircleQuestion, key: 'explanation', tone: 'status-danger' },
  { icon: Users, key: 'teacher', tone: 'status-warning' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <>
      <section className="hero-grid overflow-hidden border-b border-stone-200 py-14 sm:py-20 lg:py-24">
        <div className="page-container grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="animate-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lavender-200 bg-lavender-50 px-4 py-2 text-sm font-bold text-lavender-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('home.badge')}
            </div>
            <h1 className="max-w-3xl font-display text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[4.6rem]">
              {t('home.title')} <span className="text-lavender-600">{t('home.titleAccent')}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">{t('home.description')}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/student/onboarding')}>{t('home.diagnostic')} <ArrowRight className="h-5 w-5" /></Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/student/dashboard')}>{t('home.demo')}</Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-stone-600">
              {['grades', 'languages', 'free'].map((key) => <span key={key} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-mint-700" />{t(`home.facts.${key}`)}</span>)}
            </div>
          </div>
          <div className="hero-visual relative mx-auto w-full max-w-xl">
            <span className="hero-orb -right-8 -top-8 h-28 w-28 bg-lime/40" aria-hidden="true" />
            <span className="hero-orb -bottom-7 left-2 h-36 w-36 bg-lavender-200/60" aria-hidden="true" />
            <div className="motion-card absolute -left-3 top-12 z-10 rounded-2xl border border-stone-200 bg-paper p-4 shadow-soft sm:-left-10">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{t('home.gapFound')}</p>
              <p className="mt-1 font-bold">{t('home.factorization')}</p>
            </div>
            <div className="motion-card absolute -right-2 bottom-16 z-10 rounded-2xl bg-ink p-4 text-white shadow-soft sm:-right-8">
              <p className="text-xs font-bold uppercase tracking-wider text-lime">{t('home.nextStep')}</p>
              <p className="mt-1 font-bold">{t('home.stepMeta')}</p>
            </div>
            <div className="rounded-[3rem] border border-lavender-200 bg-canvas p-2 shadow-soft">
              <img src={mascot} alt={t('aiCompanion.alt')} className="mascot-image aspect-[4/4.5] w-full rounded-[2.6rem] object-cover" width="700" height="780" fetchPriority="high" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="page-container">
          <Reveal className="max-w-2xl"><p className="eyebrow">{t('home.featuresEyebrow')}</p><h2 className="page-title mt-4">{t('home.featuresTitle')}</h2><p className="mt-5 text-lg text-stone-600">{t('home.featuresText')}</p></Reveal>
          <Reveal className="stagger-grid mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4" delay={90}>
            {features.map(({ icon: Icon, key, tone }, index) => (
              <Card key={key} className={`p-6 ${index === 1 ? 'md:translate-y-6' : ''}`}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-6 text-xl font-extrabold leading-snug">{t(`home.features.${key}.title`)}</h3><p className="mt-3 text-sm leading-7 text-stone-600">{t(`home.features.${key}.text`)}</p>
              </Card>
            ))}
          </Reveal>
        </div>
      </section>

      <section id="product" className="pb-20 sm:pb-28">
        <div className="page-container">
          <Reveal className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><p className="eyebrow">{t('home.productEyebrow')}</p><h2 className="page-title mt-4">{t('home.productTitle')}</h2></div>
            <p className="max-w-xl text-stone-600">{t('home.productText')}</p>
          </Reveal>
          <Reveal className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-ink p-3 shadow-soft sm:p-5" delay={100}>
            <div className="overflow-hidden rounded-[2rem] bg-canvas">
              <div className="flex items-center gap-2 border-b border-stone-200 bg-paper px-5 py-4"><span className="h-3 w-3 rounded-full bg-danger-500" /><span className="h-3 w-3 rounded-full bg-warning-500" /><span className="h-3 w-3 rounded-full bg-mint-500" /><span className="ml-3 text-xs font-bold text-stone-400">{t('home.demoCabinet')}</span></div>
              <div className="grid lg:grid-cols-[210px_1fr]">
                <div className="hidden border-r border-stone-200 bg-paper p-5 lg:block">
                  <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span><span className="font-display font-semibold">SANAQ</span></div>
                  <div className="mt-8 space-y-2">{['overview', 'path', 'map', 'assistant'].map((key, index) => <div key={key} className={`rounded-xl px-3 py-3 text-sm font-bold ${index === 0 ? 'bg-lavender-100 text-lavender-700' : 'text-stone-500'}`}>{t(`home.demoNav.${key}`)}</div>)}</div>
                </div>
                <div className="p-5 sm:p-8">
                  <p className="text-sm font-bold text-lavender-700">{t('home.demoGreeting')}</p><h3 className="mt-1 text-2xl font-extrabold">{t('home.demoNextStep')}</h3>
                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                    <div className="rounded-3xl bg-ink p-6 text-white sm:p-8"><span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">{t('home.stepOfDay')}</span><h4 className="mt-6 text-2xl font-extrabold">{t('home.factorization')}</h4><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">{t('home.skillUnlocks')}</p><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-lime" /></div></div>
                    <div className="rounded-3xl border border-stone-200 bg-paper p-6"><MessageCircleQuestion className="h-7 w-7 text-lavender-600" /><p className="mt-5 font-extrabold">{t('home.needHelp')}</p><p className="mt-2 text-sm leading-6 text-stone-500">{t('home.helpText')}</p><Link to="/student/assistant" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-lavender-700">{t('home.openChat')} <ArrowRight className="h-4 w-4" /></Link></div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">{['streak', 'mastered', 'goal'].map((key) => <div key={key} className="rounded-2xl border border-stone-200 bg-paper p-4"><p className="text-xl font-extrabold">{t(`home.stats.${key}.value`)}</p><p className="mt-1 text-xs text-stone-500">{t(`home.stats.${key}.label`)}</p></div>)}</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink py-20 text-white sm:py-28">
        <Reveal className="page-container grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div><p className="eyebrow text-lime">{t('home.cycleEyebrow')}</p><h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">{t('home.cycleTitle')}</h2></div>
          <div className="stagger-grid grid gap-3 sm:grid-cols-2">
            {[
              'goal', 'diagnostic', 'gap', 'result',
            ].map((key, index) => (
              <div key={key} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"><span className="font-display text-sm text-lime">0{index + 1}</span><h3 className="mt-8 text-xl font-bold">{t(`home.cycle.${key}.title`)}</h3><p className="mt-2 text-sm leading-6 text-stone-400">{t(`home.cycle.${key}.text`)}</p></div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="py-20 sm:py-28">
        <div className="page-container">
          <Reveal className="grid overflow-hidden rounded-[2.5rem] bg-lavender-100 lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16"><p className="eyebrow">{t('home.accessEyebrow')}</p><h2 className="page-title mt-4">{t('home.accessTitle')}</h2><p className="mt-5 max-w-xl text-stone-600">{t('home.accessText')}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-paper p-5"><Languages className="h-6 w-6 text-lavender-600" /><p className="mt-3 font-bold">{t('home.threeLanguages')}</p></div>
                <div className="rounded-2xl bg-paper p-5"><ShieldCheck className="h-6 w-6 text-mint-700" /><p className="mt-3 font-bold">{t('home.safeAi')}</p></div>
              </div>
            </div>
            <div className="grid place-items-center bg-lavender-600 p-10 text-center text-white"><div><p className="font-display text-6xl font-semibold tracking-[-0.06em] sm:text-8xl">+27%</p><p className="mt-3 max-w-sm text-lavender-100">{t('home.metricText')}</p><p className="mt-4 text-xs text-lavender-200">{t('home.metricDisclaimer')}</p></div></div>
          </Reveal>
        </div>
      </section>

      <section id="ai" className="pb-20 sm:pb-28">
        <Reveal className="page-container grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.5rem] bg-ink p-8 text-white sm:p-12">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink"><BrainCircuit className="h-7 w-7" /></span>
            <p className="eyebrow mt-8 text-lime">{t('home.aiEyebrow')}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">{t('home.aiTitle')}</h2>
            <p className="mt-5 leading-7 text-stone-400">{t('home.aiText')}</p>
          </div>
          <div className="stagger-grid grid gap-4 sm:grid-cols-2">
            {[
              'context', 'explanation', 'learning', 'reason',
            ].map((key, index) => <Card key={key} className="p-6 sm:p-7"><span className="font-display text-sm font-semibold text-lavender-600">0{index + 1}</span><h3 className="mt-8 text-xl font-extrabold">{t(`home.aiPoints.${key}.title`)}</h3><p className="mt-3 text-sm leading-7 text-stone-600">{t(`home.aiPoints.${key}.text`)}</p></Card>)}
          </div>
        </Reveal>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="page-container">
          <Reveal className="rounded-[2.5rem] border border-stone-200 bg-paper p-8 sm:p-12">
            <div className="max-w-2xl"><p className="eyebrow">{t('home.sanaEyebrow')}</p><h2 className="page-title mt-4">{t('home.sanaTitle')}</h2><p className="mt-5 text-lg leading-8 text-stone-600">{t('home.sanaText')}</p></div>
            <div className="stagger-grid mt-10 grid gap-4 md:grid-cols-3">
              {[
                'notices', 'supports', 'letsGo',
              ].map((key) => <div key={key} className="rounded-3xl bg-canvas p-6"><p className="font-extrabold text-lavender-700">{t(`home.sanaPoints.${key}.title`)}</p><p className="mt-4 text-sm leading-7 text-stone-600">{t(`home.sanaPoints.${key}.text`)}</p></div>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-container">
          <Reveal className="shine-sweep rounded-[2.5rem] bg-lime p-8 text-ink sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div><p className="eyebrow text-ink">{t('home.ctaEyebrow')}</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{t('home.ctaTitle')}</h2></div>
            <Link to="/student/onboarding" className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink px-7 font-bold text-white transition hover:bg-stone-800 lg:mt-0">{t('home.ctaButton')} <ArrowRight className="h-5 w-5" /></Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
