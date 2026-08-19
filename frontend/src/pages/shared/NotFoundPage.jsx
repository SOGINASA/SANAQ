import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '../../components/layout/Header';
import { Button } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return <main className="grid min-h-screen place-items-center bg-canvas p-5"><div className="w-full max-w-xl text-center"><div className="flex justify-center"><Brand /></div><p className="mt-14 font-display text-7xl font-semibold text-lavender-300 sm:text-8xl">404</p><h1 className="mt-4 text-3xl font-extrabold">{t('notFound.title')}</h1><p className="mt-3 text-stone-600">{t('notFound.description')}</p><div className="mt-7 grid gap-3 sm:flex sm:justify-center"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /> {t('notFound.back')}</Button><Button onClick={() => navigate('/')}><Home className="h-5 w-5" /> {t('notFound.home')}</Button></div></div></main>;
}
