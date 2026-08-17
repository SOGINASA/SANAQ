import { cn } from '../lib/cn';

export function Skeleton({ className, lines = 1, ...props }) {
  return <div className={cn('space-y-3', className)} aria-hidden="true" {...props}>{Array.from({ length: lines }, (_, index) => <div key={index} className={cn('h-4 animate-pulse rounded-full bg-stone-200', index === lines - 1 && lines > 1 && 'w-2/3')} />)}</div>;
}
