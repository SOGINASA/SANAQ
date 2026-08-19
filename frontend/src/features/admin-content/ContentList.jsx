import { useEffect, useState } from 'react';
import { BookOpen, MoreHorizontal, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { adminContentApi } from './adminContentApi';

export function ContentList() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = async () => { setLoading(true); try { const response = await adminContentApi.list(); setItems(response.data.items || []); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const publish = async () => { setLoading(true); try { await adminContentApi.publish(selected.id); setSelected(null); setToast(t('contentLibrary.publishedToast')); await load(); } catch (requestError) { setError(requestError.message); setLoading(false); } };
  const remove = async () => { setLoading(true); try { await adminContentApi.remove(selected.id); setSelected(null); setToast(t('contentLibrary.removedToast')); await load(); } catch (requestError) { setError(requestError.message); setLoading(false); } };

  return <div>
    {error && <div className="state-error mb-5" role="alert">{error}</div>}
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">{t('contentLibrary.modules')}</h2><p className="mt-1 text-sm text-stone-500">{t('contentLibrary.modulesDescription')}</p></div><Button className="w-full sm:w-auto" onClick={() => navigate('/teacher/content/new')}><Plus className="h-5 w-5" /> {t('contentLibrary.newModule')}</Button></div>
    <div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><BookOpen className="h-6 w-6" /></span><div className="min-w-0 flex-1"><p className="break-words font-extrabold">{item.title}</p><p className="mt-1 break-words text-sm text-stone-500">{item.description} · {t('contentLibrary.version', { version: item.version })}</p></div><div className="flex items-center justify-between gap-3 sm:contents"><span className={`self-start rounded-full px-3 py-1.5 text-xs font-bold ${item.status === 'published' ? 'bg-mint-100 text-mint-700' : 'bg-stone-100 text-stone-600'}`}>{t(item.status === 'published' ? 'contentLibrary.published' : 'contentLibrary.draft')}</span><button onClick={() => setSelected(item)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-stone-100" aria-label={t('contentLibrary.actions', { title: item.title })}><MoreHorizontal className="h-5 w-5" /></button></div></div>)}{!items.length && !loading && <p className="py-8 text-center text-sm text-stone-500">{t('contentLibrary.empty')}</p>}</div>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description={t('contentLibrary.dialogDescription')} footer={<Button variant="ghost" onClick={() => setSelected(null)}>{t('contentLibrary.close')}</Button>}><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => navigate(`/teacher/content/${selected.id}/edit`)} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold transition hover:bg-lavender-50"><Pencil className="h-5 w-5 text-lavender-600" /> {t('contentLibrary.edit')}</button>{selected?.status !== 'published' && <button onClick={publish} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left font-bold transition hover:bg-stone-100"><Send className="h-5 w-5 text-lavender-600" /> {t('contentLibrary.publish')}</button>}<button onClick={remove} className="flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl border border-danger-200 p-4 text-left font-bold text-danger-700 transition hover:bg-danger-100"><Trash2 className="h-5 w-5" /> {t('contentLibrary.delete')}</button></div></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
