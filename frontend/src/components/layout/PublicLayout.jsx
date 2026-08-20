import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { useI18n } from '../../shared/i18n/i18n';
import { AccessibilityMenu } from '../../features/accessibility';

export function PublicLayout() {
  const { hash } = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    if (!hash) return;
    const section = document.getElementById(hash.slice(1));
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">{t('common.skip')}</a>
      <Header />
      <main id="main-content" tabIndex="-1" className="route-stage"><Outlet /></main>
      <Footer />
      <AccessibilityMenu />
    </div>
  );
}
