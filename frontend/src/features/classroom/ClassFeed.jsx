import { useState } from 'react';
import { BookOpenCheck, CalendarClock, Download, FileText, Megaphone, Pin, Trash2 } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { contentApi } from '../../shared/api/contentApi';
import { saveBlobResponse } from '../../shared/lib/downloadFile';

const dateLocales = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };

function dateLabel(value, locale, withTime = false) {
  if (!value) return null;
  return new Intl.DateTimeFormat(dateLocales[locale] || 'ru-RU', {
    day: 'numeric', month: 'long', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function ClassFeed({ announcements = [], assignments = [], role = 'student', onOpenAssignment, onRemoveAnnouncement }) {
  const { locale, t } = useI18n();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const items = [
    ...announcements.map((item) => ({ ...item, kind: 'announcement', sortDate: item.created_at })),
    ...assignments.map((item) => ({ ...item, kind: 'assignment', sortDate: item.created_at })),
  ].sort((left, right) => new Date(right.sortDate) - new Date(left.sortDate));

  const downloadWorkbook = async (item) => {
    setDownloadingId(item.id); setDownloadError('');
    try {
      const response = item.workbook.kind === 'uploaded'
        ? await contentApi.material(item.workbook.material_id)
        : await contentApi.moduleWorkbook(item.module_id);
      saveBlobResponse(response, item.workbook.filename || `sanaq-${item.id}-workbook.pdf`);
    } catch (error) { setDownloadError(error.message); }
    finally { setDownloadingId(null); }
  };

  if (!items.length) {
    return (
      <Card className="border-dashed p-8 text-center sm:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><Megaphone className="h-6 w-6" /></span>
        <h2 className="mt-5 text-xl font-extrabold">{t('classFeed.emptyTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">{t('classFeed.emptyText')}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {downloadError && <p className="state-error" role="alert">{downloadError}</p>}
      {items.map((item) => item.kind === 'announcement' ? (
        <Card key={`announcement-${item.id}`} className={`p-5 sm:p-6 ${item.is_pinned ? 'border-lavender-300 bg-lavender-50' : ''}`}>
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender-100 text-lavender-700">
              {item.is_pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-lavender-700">{t('classFeed.announcement')}</p>
                <span className="text-xs text-stone-400">{item.author} · {dateLabel(item.created_at, locale, true)}</span>
              </div>
              <h2 className="mt-2 break-words text-lg font-extrabold sm:text-xl">{item.title}</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600 sm:text-base">{item.body}</p>
            </div>
            {role === 'teacher' && <button type="button" onClick={() => onRemoveAnnouncement?.(item)} className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-stone-400 transition hover:bg-danger-100 hover:text-danger-700" aria-label={t('classFeed.removeAnnouncement', { title: item.title })}><Trash2 className="h-4 w-4" /></button>}
          </div>
        </Card>
      ) : (
        <Card key={`assignment-${item.id}`} className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mint-100 text-mint-700"><BookOpenCheck className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mint-700">{t(item.module_id ? 'classFeed.module' : 'classFeed.assignment')}</p>
              <h2 className="mt-1 break-words text-lg font-extrabold">{item.module_title || item.title}</h2>
              {item.module_description && <p className="mt-1 break-words text-sm leading-6 text-stone-600">{item.module_description}</p>}
              {item.module_title && item.title !== item.module_title && <p className="mt-2 break-words text-xs font-semibold text-stone-500">{t('classFeed.assignmentName', { title: item.title })}</p>}
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-500"><CalendarClock className="h-4 w-4 shrink-0" />{item.due_at ? t('classFeed.due', { date: dateLabel(item.due_at, locale, true) }) : t('classFeed.noDeadline')}</p>
              {role === 'teacher' && <ProgressBar className="mt-4 max-w-xl" value={item.progress || 0} label={t('assignmentProgress.summary', { completed: item.completed_students || 0, started: item.started_students || 0, total: item.total_students || 0 })} />}
              {role === 'student' && item.my_progress && <ProgressBar className="mt-4 max-w-xl" value={item.my_progress.progress || 0} label={item.my_progress.status === 'completed' ? t('assignmentProgress.studentCompleted') : item.my_progress.status === 'in_progress' ? t('assignmentProgress.partsCompleted', { completed: item.my_progress.completed_tasks, total: item.my_progress.total_tasks }) : t('assignmentProgress.notStarted')} tone={item.my_progress.status === 'completed' ? 'mint' : 'violet'} />}
            </div>
            <div className="grid w-full shrink-0 gap-2 sm:w-auto"><Button variant={role === 'student' ? 'primary' : 'outline'} className="w-full" onClick={() => onOpenAssignment?.(item)}>{t(role === 'student' ? item.module_id ? 'classFeed.openModule' : 'classFeed.start' : 'classFeed.details')}</Button>{item.workbook && <Button variant="outline" className="w-full" loading={downloadingId === item.id} onClick={() => downloadWorkbook(item)}><Download className="h-4 w-4" /> {t('classFeed.downloadWorkbook')}</Button>}</div>
          </div>
          {item.workbook && <div className="mt-4 flex items-start gap-3 rounded-2xl bg-lavender-50 p-3 text-sm text-lavender-800"><FileText className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{t('classFeed.workbook')}</strong><span className="mt-0.5 block break-all text-xs text-stone-500">{item.workbook.filename}</span></span></div>}
        </Card>
      ))}
    </div>
  );
}
