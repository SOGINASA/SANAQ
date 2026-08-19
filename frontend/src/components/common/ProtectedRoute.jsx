import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuthStore } from '../../features/auth/authStore';
import { useI18n } from '../../shared/i18n/i18n';

export function ProtectedRoute() {
  const { t } = useI18n();
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  if (status === 'loading') return <div className="grid min-h-screen place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-lavender-600" aria-label={t('route.checkingSession')} /></div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
