import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Dialog, StatusToast } from '../../shared/ui';
import { adminContentApi } from '../../features/admin-content/adminContentApi';
import { catalogApi } from '../../shared/api/catalogApi';

export function ContentEditorPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', subject_id: 'mathematics', topic_id: '', grade: 9, theory: '', example: '' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    catalogApi.topics('mathematics').then((response) => {
      setTopics(response.data.items || []);
      setForm((current) => ({ ...current, topic_id: response.data.items?.[0]?.id || '' }));
    }).catch((requestError) => setError(requestError.message));
  }, []);

  const save = async () => {
    setLoading(true); setError('');
    try {
      const response = await adminContentApi.create(form);
      setStatus(`Черновик «${response.data.module.title}» сохранён`);
      window.setTimeout(() => navigate('/teacher/content'), 700);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  return <div className="mx-auto max-w-5xl animate-rise"><button onClick={() => navigate('/teacher/content')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> К материалам</button><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Конструктор контента</p><h1 className="page-title mt-3">Новый учебный модуль</h1></div><div className="flex gap-2"><Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /> Предпросмотр</Button><Button loading={loading} disabled={!form.title || !form.topic_id || !form.theory} onClick={save}><Save className="h-4 w-4" /> Сохранить</Button></div></div>{error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}<Card className="mt-6 p-6 sm:p-8"><form className="space-y-6" onSubmit={(event) => event.preventDefault()}><div><label className="field-label" htmlFor="module-title">Название модуля</label><input id="module-title" className="field-control" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div className="grid gap-5 sm:grid-cols-2"><label className="field-label">Тема<select className="field-control mt-2" value={form.topic_id} onChange={(event) => setForm({ ...form, topic_id: event.target.value })}>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label><label className="field-label">Класс<input type="number" min="7" max="12" className="field-control mt-2" value={form.grade} onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })} /></label></div><div><label className="field-label" htmlFor="description">Короткое описание</label><textarea id="description" rows="3" className="field-control py-3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div><label className="field-label" htmlFor="theory">Теория и объяснение</label><textarea id="theory" rows="8" className="field-control py-3" value={form.theory} onChange={(event) => setForm({ ...form, theory: event.target.value })} /></div><div><label className="field-label" htmlFor="example">Пример</label><textarea id="example" rows="3" className="field-control py-3" value={form.example} onChange={(event) => setForm({ ...form, example: event.target.value })} /></div></form></Card>
    <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title="Предпросмотр модуля" description="Так материал увидит ученик." size="lg" footer={<Button onClick={() => setPreviewOpen(false)}>Вернуться к редактору</Button>}><article><span className="rounded-full bg-lavender-100 px-3 py-1.5 text-xs font-bold text-lavender-700">Математика · {form.grade} класс</span><h3 className="mt-5 font-display text-3xl font-semibold">{form.title || 'Без названия'}</h3><p className="mt-4 text-stone-600">{form.description}</p><div className="mt-7 rounded-3xl bg-ink p-7 text-white whitespace-pre-wrap">{form.theory || 'Добавьте теорию'}</div>{form.example && <div className="mt-5 rounded-2xl bg-mint-100 p-5"><strong>Пример:</strong> {form.example}</div>}</article></Dialog><StatusToast message={status} onClose={() => setStatus('')} />
  </div>;
}
