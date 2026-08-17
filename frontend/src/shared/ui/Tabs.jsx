import { cn } from '../lib/cn';

export function Tabs({ items, value, onChange, label, className }) {
  return <div className={cn('flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-stone-100 p-1', className)} role="tablist" aria-label={label}>{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={value === item.value} onClick={() => onChange(item.value)} className={cn('min-h-11 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-bold transition', value === item.value ? 'bg-paper text-lavender-700 shadow-sm' : 'text-stone-600 hover:text-ink')}>{item.label}</button>)}</div>;
}
