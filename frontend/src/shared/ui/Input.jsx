import { useId } from 'react';
import { cn } from '../lib/cn';

export function Input({ id, label, hint, error, className, inputClassName, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  return <div className={className}>
    {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
    <input id={inputId} className={cn('field-control', error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-100', inputClassName)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : hint ? hintId : undefined} {...props} />
    {hint && !error && <p id={hintId} className="mt-2 text-sm text-stone-500">{hint}</p>}
    {error && <p id={errorId} className="mt-2 text-sm font-semibold text-danger-700" role="alert">{error}</p>}
  </div>;
}
