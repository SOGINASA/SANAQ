import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAccessibilityStore } from '../features/accessibility/accessibilityStore';

function AccessibilitySync({ children }) {
  const { largeText, highContrast, reducedMotion } = useAccessibilityStore();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', largeText);
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduce-motion', reducedMotion);
  }, [largeText, highContrast, reducedMotion]);
  return children;
}

export function AppProviders({ children }) {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AccessibilitySync>{children}</AccessibilitySync>
    </BrowserRouter>
  );
}
