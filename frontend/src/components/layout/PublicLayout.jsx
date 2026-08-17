import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';

export function PublicLayout() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const section = document.getElementById(hash.slice(1));
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-white">К основному содержимому</a>
      <Header />
      <main id="main-content" tabIndex="-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
