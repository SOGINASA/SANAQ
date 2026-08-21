import { cn } from '../lib/cn';

export function Skeleton({ className, lines = 1, ...props }) {
  return <div className={cn('skeleton-stack space-y-3', className)} aria-hidden="true" {...props}>{Array.from({ length: lines }, (_, index) => <div key={index} className={cn('skeleton-shape h-4 rounded-full bg-stone-200', index === lines - 1 && lines > 1 && 'w-2/3')} />)}</div>;
}

export function PageSkeleton({ className, layout = 'cards', cards = 3, label = 'Загрузка данных' }) {
  return (
    <div className={cn('content-skeleton mx-auto w-full max-w-6xl', className)} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton-shape h-3 w-28 rounded-full bg-lavender-200" />
      <div className="skeleton-shape mt-4 h-10 w-full max-w-lg rounded-2xl bg-stone-200" />
      <div className="skeleton-shape mt-3 h-4 w-full max-w-2xl rounded-full bg-stone-200" />
      {layout === 'form' ? (
        <div className="mt-8 rounded-3xl border border-stone-200 bg-paper p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => <div key={item}><div className="skeleton-shape h-3 w-24 rounded-full bg-stone-200" /><div className="skeleton-shape mt-3 h-12 rounded-2xl bg-stone-100" /></div>)}
          </div>
          <div className="skeleton-shape mt-7 h-12 w-36 rounded-2xl bg-lavender-100" />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cards }, (_, index) => <div key={index} className="min-h-44 rounded-3xl border border-stone-200 bg-paper p-6"><div className="skeleton-shape h-12 w-12 rounded-2xl bg-lavender-100" /><div className="skeleton-shape mt-6 h-5 w-3/4 rounded-full bg-stone-200" /><div className="skeleton-shape mt-4 h-4 w-full rounded-full bg-stone-100" /><div className="skeleton-shape mt-2 h-4 w-2/3 rounded-full bg-stone-100" /></div>)}
        </div>
      )}
    </div>
  );
}
