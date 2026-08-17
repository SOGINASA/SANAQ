import { useEffect, useState } from 'react';
import { BookOpen, MoreHorizontal, Plus, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import { adminContentApi } from './adminContentApi';

export function ContentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try { const response = await adminContentApi.list(); setItems(response.data.items || []); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const publish = async () => {
    setLoading(true);
    try { await adminContentApi.publish(selected.id); setSelected(null); setToast('Модуль опубликован'); await load(); }
    catch (requestError) { setError(requestError.message); setLoading(false); }
  };
  const remove = async () => {
    setLoading(true);
    try { await adminContentApi.remove(selected.id); setSelected(null); setToast('Черновик удалён'); await load(); }
    catch (requestError) { setError(requestError.message); setLoading(false); }
  };

  return <div>{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">Учебные модули</h2><p className="mt-1 text-sm text-stone-500">Опубликованные материалы и черновики backend</p></div><Button onClick={() => navigate('/teacher/content/new')}><Plus className="h-5 w-5" /> Новый модуль</Button></div><div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><BookOpen className="h-6 w-6" /></span><div className="flex-1"><p className="font-extrabold">{item.title}</p><p className="mt-1 text-sm text-stone-500">{item.description} · версия {item.version}</p></div><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${item.status === 'published' ? 'bg-mint-100 text-mint-700' : 'bg-stone-100 text-stone-600'}`}>{item.status === 'published' ? 'Опубликован' : 'Черновик'}</span><button onClick={() => setSelected(item)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-stone-100" aria-label={`Действия с ${item.title}`}><MoreHorizontal className="h-5 w-5" /></button></div>)}{!items.length && !loading && <p className="py-8 text-center text-sm text-stone-500">Материалов пока нет.</p>}</div>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description="Действия сохраняются в backend" footer={<Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button>}><div className="grid gap-3 sm:grid-cols-2">{selected?.status !== 'published' && <button onClick={publish} className="flex min-h-20 items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold hover:bg-stone-100"><Send className="h-5 w-5 text-lavender-600" /> Опубликовать</button>}<button onClick={remove} className="flex min-h-20 items-center gap-4 rounded-2xl border border-red-200 p-4 text-left font-bold text-red-800 hover:bg-red-50"><Trash2 className="h-5 w-5" /> Удалить</button></div></Dialog><StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
