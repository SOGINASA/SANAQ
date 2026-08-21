import { Inbox } from 'lucide-react';
import { cn } from '../../shared/lib/cn';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return <div className={cn('state-empty state-panel', className)}><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Icon className="h-6 w-6" aria-hidden="true" /></span><h2 className="mt-5 text-xl font-extrabold text-ink">{title}</h2>{description && <p className="mx-auto mt-2 max-w-lg leading-7 text-stone-500">{description}</p>}{action && <div className="mt-6 flex justify-center">{action}</div>}</div>;
}
