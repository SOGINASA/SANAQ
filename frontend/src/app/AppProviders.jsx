import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAccessibilityStore } from '../features/accessibility/accessibilityStore';
import { useAuthStore } from '../features/auth/authStore';

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

function AuthSync({ children }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return children;
}

export function AppProviders({ children }) {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AccessibilitySync><AuthSync>{children}</AuthSync></AccessibilitySync>
    </BrowserRouter>
  );
}
