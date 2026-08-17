import { BookOpen, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/ui';

export function ContentList() {
  const navigate = useNavigate();
  const items = [
    { title: 'Разложение на множители', lessons: 4, status: 'Опубликован', updated: 'Сегодня, 09:40' },
    { title: 'Квадратные уравнения', lessons: 5, status: 'Опубликован', updated: 'Вчера, 16:20' },
    { title: 'Графики функций', lessons: 4, status: 'Черновик', updated: '14 августа' },
  ];
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">Учебные модули</h2><p className="mt-1 text-sm text-stone-500">Математика · 9 класс</p></div><Button onClick={() => navigate('/teacher/content/new')}><Plus className="h-5 w-5" /> Новый модуль</Button></div><div className="mt-6 space-y-3">{items.map((item) => <div key={item.title} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><BookOpen className="h-6 w-6" /></span><div className="flex-1"><p className="font-extrabold">{item.title}</p><p className="mt-1 text-sm text-stone-500">{item.lessons} урока · изменено {item.updated}</p></div><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${item.status === 'Опубликован' ? 'bg-mint-100 text-mint-700' : 'bg-stone-100 text-stone-600'}`}>{item.status}</span><button className="grid h-11 w-11 place-items-center rounded-xl bg-stone-100" aria-label={`Редактировать ${item.title}`}><Pencil className="h-4 w-4" /></button><button className="grid h-11 w-11 place-items-center rounded-xl" aria-label={`Действия с ${item.title}`}><MoreHorizontal className="h-5 w-5" /></button></div>)}</div></div>;
}
