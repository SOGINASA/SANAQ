import { ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '../../components/layout/Header';
import { Button } from '../../shared/ui';

export function NotFoundPage() {
  const navigate = useNavigate();
  return <main className="grid min-h-screen place-items-center bg-canvas p-5"><div className="w-full max-w-xl text-center"><div className="flex justify-center"><Brand /></div><p className="mt-14 font-display text-8xl font-semibold text-lavender-300">404</p><h1 className="mt-4 text-3xl font-extrabold">Этот узел ещё не открыт</h1><p className="mt-3 text-stone-600">Проверь адрес или вернись на предыдущий шаг маршрута.</p><div className="mt-7 flex justify-center gap-3"><Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /> Назад</Button><Button onClick={() => navigate('/')}><Home className="h-5 w-5" /> На главную</Button></div></div></main>;
}
