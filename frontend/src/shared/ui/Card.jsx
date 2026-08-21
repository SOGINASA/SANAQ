import { cn } from '../lib/cn';

export function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component className={cn('surface-card motion-card min-w-0 max-w-full', className)} {...props}>
      {children}
    </Component>
  );
}
