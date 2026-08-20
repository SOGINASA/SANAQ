import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

export function Reveal({ as: Component = 'div', className, children, delay = 0, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <Component ref={ref} className={cn('reveal', visible && 'reveal-visible', className)} style={{ '--reveal-delay': `${delay}ms`, ...props.style }} {...props}>{children}</Component>;
}
