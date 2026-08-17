import { cn } from '../lib/cn';

export function Card({ as: Component = 'div', className, children, ...props }) {
  return (
    <Component className={cn('surface-card', className)} {...props}>
      {children}
    </Component>
  );
}
