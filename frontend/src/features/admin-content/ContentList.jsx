import { useState } from 'react';
import { BookOpen, Copy, MoreHorizontal, Pencil, Plus, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, StatusToast } from '../../shared/ui';

export function ContentList() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  const items = [
    { title: 'Разложение на множители', lessons: 4, status: 'Опубликован', updated: 'Сегодня, 09:40' },
    { title: 'Квадратные уравнения', lessons: 5, status: 'Опубликован', updated: 'Вчера, 16:20' },
    { title: 'Графики функций', lessons: 4, status: 'Черновик', updated: '14 августа' },
  ];
  return <div><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">Учебные модули</h2><p className="mt-1 text-sm text-stone-500">Математика · 9 класс</p></div><Button onClick={() => navigate('/teacher/content/new')}><Plus className="h-5 w-5" /> Новый модуль</Button></div><div className="mt-6 space-y-3">{items.map((item) => <div key={item.title} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><BookOpen className="h-6 w-6" /></span><div className="flex-1"><p className="font-extrabold">{item.title}</p><p className="mt-1 text-sm text-stone-500">{item.lessons} урока · изменено {item.updated}</p></div><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${item.status === 'Опубликован' ? 'bg-mint-100 text-mint-700' : 'bg-stone-100 text-stone-600'}`}>{item.status}</span><button onClick={() => navigate('/teacher/content/new')} className="grid h-11 w-11 place-items-center rounded-xl bg-stone-100" aria-label={`Редактировать ${item.title}`}><Pencil className="h-4 w-4" /></button><button onClick={() => setSelected(item)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-stone-100" aria-label={`Действия с ${item.title}`}><MoreHorizontal className="h-5 w-5" /></button></div>)}</div>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description="Действия с учебным модулем" footer={<Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button>}><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => { setSelected(null); setToast('Копия модуля создана как черновик'); }} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-stone-100"><Copy className="h-5 w-5 text-lavender-600" /> Создать копию</button><button onClick={() => { setSelected(null); setToast('Модуль добавлен в новое назначение'); }} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-stone-100"><Send className="h-5 w-5 text-lavender-600" /> Назначить классу</button></div></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
