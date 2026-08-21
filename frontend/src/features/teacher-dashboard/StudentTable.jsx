import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';

export function StudentTable({ students = [], limit, search = '' }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const riskLabel = { stable: [t('studentTable.stable'), 'bg-mint-100 text-mint-700'], attention: [t('studentTable.attention'), 'status-warning'], risk: [t('studentTable.risk'), 'status-danger'] };
  const filtered = students.filter((student) => student.name.toLowerCase().includes(search.toLowerCase()));
  const rows = limit ? filtered.slice(0, limit) : filtered;
  const openProfile = (student) => navigate(`/teacher/students/${student.id}`);
  if (!rows.length) return <p className="py-8 text-center text-sm text-stone-500">{t('studentTable.empty')}</p>;

  return <div className="min-w-0 max-w-full">
    <div className="grid min-w-0 gap-3 md:hidden">{rows.map((student) => {
      const risk = riskLabel[student.risk] || riskLabel.attention;
      return <button key={student.id} type="button" onClick={() => openProfile(student)} className="min-w-0 w-full cursor-pointer overflow-hidden rounded-2xl border border-stone-200 bg-paper p-4 text-left transition active:bg-lavender-50" aria-label={t('studentTable.openProfile', { name: student.name })}>
        <span className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0"><strong className="block break-words">{student.name}</strong><span className="mt-1 block break-words text-sm text-stone-500">{student.focus}</span></span><ChevronRight className="mt-1 h-5 w-5 shrink-0 text-stone-400" /></span>
        <span className="mt-4 grid grid-cols-2 gap-2 text-sm"><span className="min-w-0 rounded-xl bg-stone-100 p-3"><span className="block break-words text-xs text-stone-500">{t('studentTable.progress')}</span><strong className="mt-1 block tabular-nums">{student.progress}%</strong></span><span className="min-w-0 rounded-xl bg-stone-100 p-3"><span className="block break-words text-xs text-stone-500">{t('studentTable.activeDays')}</span><strong className="mt-1 block tabular-nums">{student.streak}</strong></span></span>
        <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${risk[1]}`}>{risk[0]}</span>
      </button>;
    })}</div>
    <div className="hidden max-w-full overflow-x-auto overscroll-x-contain md:block" tabIndex="0" role="region" aria-label={t('studentTable.student')}>
      <table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-400"><th className="px-3 py-4">{t('studentTable.student')}</th><th className="px-3 py-4">{t('studentTable.progress')}</th><th className="px-3 py-4">{t('studentTable.activeDays')}</th><th className="px-3 py-4">{t('studentTable.focus')}</th><th className="px-3 py-4">{t('studentTable.status')}</th><th aria-label={t('studentTable.action')} /></tr></thead><tbody>{rows.map((student) => { const risk = riskLabel[student.risk] || riskLabel.attention; return <tr key={student.id} className="border-b border-stone-100 last:border-0"><td className="px-3 py-4 font-bold">{student.name}</td><td className="px-3 py-4 tabular-nums">{student.progress}%</td><td className="px-3 py-4 tabular-nums">{student.streak}</td><td className="px-3 py-4 text-sm text-stone-600">{student.focus}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${risk[1]}`}>{risk[0]}</span></td><td className="px-3 py-4"><button onClick={() => openProfile(student)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-stone-100" aria-label={t('studentTable.openProfile', { name: student.name })}><ChevronRight className="h-5 w-5" /></button></td></tr>; })}</tbody></table>
    </div>
  </div>;
}
