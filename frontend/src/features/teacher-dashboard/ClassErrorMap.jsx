import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ClipboardPlus, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';

const severityTone = {
  high: 'border-coral bg-danger-50',
  medium: 'border-amber-300 bg-amber-50',
  low: 'border-lavender-200 bg-lavender-50',
};

export function ClassErrorMap({ data, onAssign }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState('');
  const items = data?.items || [];

  if (!items.length) return <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-center"><p className="font-extrabold">{t('errorMap.emptyTitle')}</p><p className="mt-2 text-sm text-stone-500">{t('errorMap.emptyText')}</p></div>;

  return <div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-danger-50 p-4"><strong className="font-display text-2xl">{data.total_errors}</strong><span className="mt-1 block text-xs text-stone-600">{t('errorMap.errors')}</span></div>
      <div className="rounded-2xl bg-lavender-50 p-4"><strong className="font-display text-2xl">{data.affected_students}</strong><span className="mt-1 block text-xs text-stone-600">{t('errorMap.students')}</span></div>
      <div className="rounded-2xl bg-mint-50 p-4"><strong className="font-display text-2xl">{data.period_days}</strong><span className="mt-1 block text-xs text-stone-600">{t('errorMap.period')}</span></div>
    </div>
    <div className="grid gap-3">
      {items.map((item) => {
        const open = expanded === item.code;
        return <section key={item.code} className={`overflow-hidden rounded-2xl border-l-4 ${severityTone[item.severity] || severityTone.low}`}>
          <button type="button" onClick={() => setExpanded(open ? '' : item.code)} aria-expanded={open} className="flex min-h-20 w-full cursor-pointer items-center gap-4 p-4 text-left sm:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper text-coral"><AlertTriangle className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><strong className="block break-words">{item.title}</strong><span className="mt-1 block text-xs text-stone-500">{item.skill_name} · {t('errorMap.counts', { errors: item.error_count, students: item.student_count })}</span></span>
            <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && <div className="border-t border-black/5 px-4 pb-5 pt-4 sm:px-5">
            <p className="text-sm leading-6 text-stone-600">{item.description}</p>
            {item.blocked_skill_count > 0 && <p className="mt-3 text-xs font-bold text-danger-700">{t('errorMap.blocks', { count: item.blocked_skill_count })}</p>}
            {item.recommended_task_prompt && <div className="mt-4 rounded-2xl bg-paper p-4"><span className="text-xs font-bold uppercase tracking-wider text-stone-400">{t('errorMap.microTask')}</span><p className="mt-2 text-sm font-bold">{item.recommended_task_prompt}</p></div>}
            {item.correction && <div className="mt-4 rounded-2xl border border-stone-200 bg-paper p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${item.correction.state === 'completed' ? 'bg-mint-100 text-mint-700' : item.correction.state === 'in_progress' ? 'bg-warning-100 text-warning-700' : 'bg-lavender-100 text-lavender-700'}`}>{item.correction.state === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{t(`errorMap.status.${item.correction.state}`)}</span><strong className="text-sm">{item.correction.completed_students}/{item.correction.total_students}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-mint-500" style={{ width: `${item.correction.progress || 0}%` }} /></div></div>}
            <div className="mt-4 flex flex-wrap gap-2">{item.students.map((student) => <button type="button" key={student.id} onClick={() => navigate(`/teacher/students/${student.id}`)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-paper px-3 text-sm font-bold shadow-sm transition hover:ring-2 hover:ring-lavender-300">{student.name}<ArrowRight className="h-4 w-4" /></button>)}</div>
            {item.recommended_task_id && <button type="button" onClick={() => onAssign?.(item)} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-lavender-700"><ClipboardPlus className="h-4 w-4" />{t(item.correction ? 'errorMap.assignAgain' : 'errorMap.assign')}</button>}
          </div>}
        </section>;
      })}
    </div>
  </div>;
}
