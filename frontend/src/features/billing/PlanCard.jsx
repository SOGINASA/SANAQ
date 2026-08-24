import { Check, Sparkles } from 'lucide-react';
import { Button, Card } from '../../shared/ui';
import { cn } from '../../shared/lib/cn';

export function PlanCard({ plan, locale, label, onSelect, loading, active = false }) {
  const localized = (value) => value?.[locale] || value?.ru || '';
  return <Card className={cn('relative flex h-full flex-col p-5 sm:p-6', plan.recommended && 'border-lavender-300 ring-2 ring-lavender-100')}>
    {plan.recommended && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1 text-xs font-extrabold text-lavender-700"><Sparkles className="h-3.5 w-3.5" /> {label.recommended}</span>}
    <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-lavender-700">{localized(plan.name)}</p>
    <div className="mt-5 flex items-end gap-2"><strong className="font-display text-5xl font-semibold tracking-[-0.08em]">1 ₸</strong><span className="pb-1 text-sm font-semibold text-stone-500">/{label.period}</span></div>
    <p className="mt-4 min-h-12 text-sm leading-6 text-stone-600">{localized(plan.description)}</p>
    <ul className="mt-6 flex-1 space-y-3">{(plan.features?.[locale] || plan.features?.ru || []).map((feature) => <li key={feature} className="flex gap-3 text-sm font-semibold"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint-100 text-mint-700"><Check className="h-3.5 w-3.5" /></span><span className="pt-0.5">{feature}</span></li>)}</ul>
    <Button className={cn('mt-7 w-full', !plan.recommended && 'shadow-none')} variant={plan.recommended ? 'primary' : 'outline'} loading={loading} onClick={() => onSelect(plan)}>{active ? label.active : label.select}</Button>
  </Card>;
}
