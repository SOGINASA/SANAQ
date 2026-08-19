import { useCallback, useEffect, useState } from 'react';
import { Bot, CheckCircle2, FileCheck2, XCircle } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast, Tabs } from '../../shared/ui';

export function AdminModerationPage() {
  const [tab, setTab] = useState('content');
  const [content, setContent] = useState([]);
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [contentResponse, reportResponse] = await Promise.all([adminApi.reviewQueue(), adminApi.aiReports()]); if (!Array.isArray(contentResponse.data.items) || !Array.isArray(reportResponse.data.items)) throw new Error('Backend вернул некорректные данные модерации'); setContent(contentResponse.data.items); setReports(reportResponse.data.items); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const moderate = async (approved) => {
    setActionLoading(true); setError('');
    try { if (approved) await adminApi.approveContent(selected.id); else await adminApi.rejectContent(selected.id, { reason: resolution || 'Требуется доработка' }); setSelected(null); setResolution(''); setToast(approved ? 'Материал опубликован' : 'Материал возвращён на доработку'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const resolveReport = async (status) => {
    setActionLoading(true); setError('');
    try { await adminApi.updateAiReport(selected.id, { status, resolution: resolution || (status === 'dismissed' ? 'Нарушение не подтверждено' : 'Ответ проверен администратором') }); setSelected(null); setResolution(''); setToast('Жалоба обработана'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const openReports = reports.filter((item) => ['open', 'reviewing'].includes(item.status));
  return <div className="mx-auto max-w-6xl animate-rise">
    <AdminPageHeader eyebrow="Безопасность и качество" title="Модерация" description="Проверяйте учебные материалы перед публикацией и разбирайте жалобы на ответы AI." />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <Tabs className="mt-7 w-full sm:w-fit" label="Раздел модерации" value={tab} onChange={setTab} items={[{ value: 'content', label: `Материалы · ${content.length}` }, { value: 'ai', label: `Жалобы AI · ${openReports.length}` }]} />
    {loading ? <Skeleton className="mt-5" lines={8} /> : tab === 'content' ? <div className="mt-5 grid gap-4">{content.map((item) => <Card key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><FileCheck2 className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-extrabold">{item.title}</h2><p className="mt-1 text-sm text-stone-500">Версия {item.version}</p></div><StatusPill tone="warning">{item.status === 'rejected' ? 'На доработке' : 'Черновик'}</StatusPill><Button variant="outline" onClick={() => { setSelected({ ...item, kind: 'content' }); setResolution(''); }}>Проверить</Button></Card>)}{!content.length && <Empty icon={CheckCircle2} title="Очередь пуста" text="Все материалы проверены." />}</div> : <div className="mt-5 grid gap-4">{reports.map((item) => <Card key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-danger-100 text-danger-700"><Bot className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h2 className="break-words font-extrabold">{item.reason}</h2><p className="mt-1 break-all text-xs text-stone-500">Ответ: {item.feedback_id} · {new Date(item.created_at).toLocaleString('ru-RU')}</p></div><StatusPill tone={item.status === 'resolved' ? 'success' : item.status === 'dismissed' ? 'neutral' : 'danger'}>{item.status}</StatusPill><Button variant="outline" onClick={() => { setSelected({ ...item, kind: 'ai' }); setResolution(item.resolution || ''); }}>Открыть</Button></Card>)}{!reports.length && <Empty icon={CheckCircle2} title="Жалоб нет" text="Пользователи пока не сообщали о проблемных ответах." />}</div>}
    <Dialog open={selected?.kind === 'content'} onClose={() => setSelected(null)} title={selected?.title || ''} description="Решение попадёт в журнал действий администратора." footer={<><Button variant="danger" loading={actionLoading} onClick={() => moderate(false)}><XCircle className="h-4 w-4" /> Вернуть</Button><Button variant="success" loading={actionLoading} onClick={() => moderate(true)}><CheckCircle2 className="h-4 w-4" /> Одобрить</Button></>}><label className="field-label">Комментарий редактору<textarea className="field-control mt-2 min-h-28" value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Что нужно исправить" /></label></Dialog>
    <Dialog open={selected?.kind === 'ai'} onClose={() => setSelected(null)} title="Жалоба на AI-ответ" description={selected?.reason || ''} footer={<><Button variant="ghost" loading={actionLoading} onClick={() => resolveReport('dismissed')}>Отклонить жалобу</Button><Button loading={actionLoading} onClick={() => resolveReport('resolved')}>Закрыть как решённую</Button></>}><div className="rounded-2xl bg-stone-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-400">ID ответа</p><p className="mt-2 break-all text-sm font-bold">{selected?.feedback_id}</p></div><label className="field-label mt-4 block">Решение<textarea className="field-control mt-2 min-h-28" value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Что было проверено и исправлено" /></label></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}

function Empty({ icon: Icon, title, text }) {
  return <Card className="p-10 text-center"><Icon className="mx-auto h-8 w-8 text-mint-700" /><h2 className="mt-4 text-xl font-extrabold">{title}</h2><p className="mt-2 text-stone-500">{text}</p></Card>;
}
