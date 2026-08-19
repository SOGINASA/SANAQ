import { cn } from '../../shared/lib/cn';

export function AdminPageHeader({ eyebrow, title, description, actions }) {
  return <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="eyebrow">{eyebrow}</p><h1 className="page-title mt-3 break-words">{title}</h1>{description && <p className="mt-3 max-w-3xl leading-7 text-stone-600">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</div>;
}

const tones = {
  success: 'bg-mint-100 text-mint-700', warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-danger-100 text-danger-700', neutral: 'bg-stone-100 text-stone-600',
  violet: 'bg-lavender-100 text-lavender-700',
};

export function StatusPill({ children, tone = 'neutral' }) {
  return <span className={cn('inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-bold', tones[tone])}>{children}</span>;
}
