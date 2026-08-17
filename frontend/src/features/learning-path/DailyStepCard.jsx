import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, ProgressBar } from '../../shared/ui';

export function DailyStepCard() {
  const navigate = useNavigate();
  return <section className="overflow-hidden rounded-4xl bg-ink text-white shadow-soft"><div className="grid lg:grid-cols-[1.15fr_0.85fr]"><div className="p-7 sm:p-10"><span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ink"><Sparkles className="h-4 w-4" /> Шаг дня</span><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.04em]">Разложение на множители</h2><p className="mt-3 max-w-xl text-stone-400">Этот навык откроет квадратные уравнения. Начнём с разности квадратов.</p><div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-300"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-lime" /> 18 минут</span><span>4 коротких задания</span></div><Button className="mt-7" onClick={() => navigate('/student/learn/factorization')}>Продолжить обучение <ArrowRight className="h-5 w-5" /></Button></div><div className="flex flex-col justify-end bg-white/[0.07] p-7 sm:p-10"><p className="text-sm font-bold text-lime">Почему этот шаг?</p><p className="mt-3 text-sm leading-7 text-stone-300">В диагностике ты уверенно решил линейное уравнение, но ошибся в формуле разности квадратов. Без неё следующая тема будет сложнее.</p><ProgressBar value={68} label="Уже пройдено" className="mt-7" tone="mint" /></div></div></section>;
}
