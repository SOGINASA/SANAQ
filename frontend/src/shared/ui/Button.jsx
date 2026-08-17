import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../lib/cn';

const variants = {
  primary: 'bg-lavender-600 text-white hover:bg-lavender-700 shadow-lift border-lavender-700',
  secondary: 'bg-lavender-100 text-lavender-700 hover:bg-lavender-200 border-lavender-200',
  dark: 'bg-ink text-white hover:bg-stone-800 border-ink',
  ghost: 'bg-transparent text-ink hover:bg-stone-100 border-transparent',
  outline: 'bg-paper text-ink hover:border-lavender-300 hover:bg-lavender-50 border-stone-300',
  success: 'bg-mint-700 text-white hover:bg-mint-500 border-mint-700',
  danger: 'bg-danger-700 text-white hover:bg-danger-500 border-danger-700',
};

export const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border px-5 font-bold transition duration-200 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        size === 'sm' && 'min-h-11 px-4 text-sm',
        size === 'lg' && 'min-h-14 px-7 text-base',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
