import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn('max-h-[92dvh] w-full overflow-y-auto rounded-t-4xl bg-paper shadow-2xl animate-rise sm:rounded-4xl', sizes[size])}>
        <header className="sticky top-0 z-10 flex items-start gap-4 border-b border-stone-200 bg-paper/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-extrabold sm:text-2xl">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-stone-500">{description}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-100 transition hover:bg-stone-200" aria-label="Закрыть окно"><X className="h-5 w-5" /></button>
        </header>
        <div className="p-5 sm:p-7">{children}</div>
        {footer && <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-stone-200 bg-paper/95 px-5 py-4 backdrop-blur-xl sm:flex-row sm:justify-end sm:px-7">{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
