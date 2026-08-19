import { useCallback, useEffect, useState } from 'react';
import { Bot, CheckCircle2, FileCheck2, XCircle } from 'lucide-react';
import { adminApi } from '../../features/admin';
import { AdminPageHeader, StatusPill } from '../../features/admin/AdminPrimitives';
import { Button, Card, Dialog, Skeleton, StatusToast, Tabs } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function AdminModerationPage() {
  const { locale, t } = useI18n();
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
    try { const [contentResponse, reportResponse] = await Promise.all([adminApi.reviewQueue(), adminApi.aiReports()]); if (!Array.isArray(contentResponse.data.items) || !Array.isArray(reportResponse.data.items)) throw new Error(t('adminRuntime.moderationInvalid')); setContent(contentResponse.data.items); setReports(reportResponse.data.items); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const moderate = async (approved) => {
    setActionLoading(true);
    setError('');
    try {
      if (approved) await adminApi.approveContent(selected.id);
      else await adminApi.rejectContent(selected.id, { reason: resolution || t('adminModeration.revisionRequired') });
      setSelected(null);
      setResolution('');
      setToast(t(approved ? 'adminModeration.publishedToast' : 'adminModeration.returnedToast'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const resolveReport = async (status) => {
    setActionLoading(true);
    setError('');
    try {
      await adminApi.updateAiReport(selected.id, { status, resolution: resolution || t(status === 'dismissed' ? 'adminModeration.notConfirmed' : 'adminModeration.checked') });
      setSelected(null);
      setResolution('');
      setToast(t('adminModeration.reportProcessed'));
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setActionLoading(false); }
  };
  const openReports = reports.filter((item) => ['open', 'reviewing'].includes(item.status));

  return <div className="mx-auto max-w-6xl animate-rise">
    <AdminPageHeader eyebrow={t('adminModeration.eyebrow')} title={t('adminModeration.title')} description={t('adminModeration.description')} />
    {error && <div className="state-error mt-6" role="alert">{error}</div>}
    <Tabs className="mt-7 w-full sm:w-fit" label={t('adminModeration.section')} value={tab} onChange={setTab} items={[{ value: 'content', label: t('adminModeration.contentTab', { count: content.length }) }, { value: 'ai', label: t('adminModeration.aiTab', { count: openReports.length }) }]} />
    {loading ? <Skeleton className="mt-5" lines={8} /> : tab === 'content' ? <div className="mt-5 grid gap-4">{content.map((item) => <Card key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><FileCheck2 className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-extrabold">{item.title}</h2><p className="mt-1 text-sm text-stone-500">{t('adminModeration.version', { version: item.version })}</p></div><StatusPill tone="warning">{t(item.status === 'rejected' ? 'adminModeration.revision' : 'adminModeration.draft')}</StatusPill><Button className="w-full sm:w-auto" variant="outline" onClick={() => { setSelected({ ...item, kind: 'content' }); setResolution(''); }}>{t('adminModeration.review')}</Button></Card>)}{!content.length && <Empty icon={CheckCircle2} title={t('adminModeration.emptyQueue')} text={t('adminModeration.allReviewed')} />}</div> : <div className="mt-5 grid gap-4">{reports.map((item) => <Card key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-danger-100 text-danger-700"><Bot className="h-6 w-6" /></span><div className="min-w-0 flex-1"><h2 className="break-words font-extrabold">{item.reason}</h2><p className="mt-1 break-all text-xs text-stone-500">{t('adminModeration.responseMeta', { id: item.feedback_id, date: new Date(item.created_at).toLocaleString(locale) })}</p></div><StatusPill tone={item.status === 'resolved' ? 'success' : item.status === 'dismissed' ? 'neutral' : 'danger'}>{t(`adminModeration.status.${item.status}`)}</StatusPill><Button className="w-full sm:w-auto" variant="outline" onClick={() => { setSelected({ ...item, kind: 'ai' }); setResolution(item.resolution || ''); }}>{t('adminModeration.open')}</Button></Card>)}{!reports.length && <Empty icon={CheckCircle2} title={t('adminModeration.noReports')} text={t('adminModeration.noReportsText')} />}</div>}
    <Dialog open={selected?.kind === 'content'} onClose={() => setSelected(null)} title={selected?.title || ''} description={t('adminModeration.auditDescription')} footer={<><Button variant="danger" loading={actionLoading} onClick={() => moderate(false)}><XCircle className="h-4 w-4" /> {t('adminModeration.return')}</Button><Button variant="success" loading={actionLoading} onClick={() => moderate(true)}><CheckCircle2 className="h-4 w-4" /> {t('adminModeration.approve')}</Button></>}><label className="field-label">{t('adminModeration.editorComment')}<textarea className="field-control mt-2 min-h-28" value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={t('adminModeration.fixPlaceholder')} /></label></Dialog>
    <Dialog open={selected?.kind === 'ai'} onClose={() => setSelected(null)} title={t('adminModeration.aiDialog')} description={selected?.reason || ''} footer={<><Button variant="ghost" loading={actionLoading} onClick={() => resolveReport('dismissed')}>{t('adminModeration.dismiss')}</Button><Button loading={actionLoading} onClick={() => resolveReport('resolved')}>{t('adminModeration.resolve')}</Button></>}><div className="rounded-2xl bg-stone-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-stone-400">{t('adminModeration.responseId')}</p><p className="mt-2 break-all text-sm font-bold">{selected?.feedback_id}</p></div><label className="field-label mt-4 block">{t('adminModeration.resolution')}<textarea className="field-control mt-2 min-h-28" value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={t('adminModeration.resolutionPlaceholder')} /></label></Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}

function Empty({ icon: Icon, title, text }) {
  return <Card className="p-10 text-center"><Icon className="mx-auto h-8 w-8 text-mint-700" /><h2 className="mt-4 text-xl font-extrabold">{title}</h2><p className="mt-2 text-stone-500">{text}</p></Card>;
}
