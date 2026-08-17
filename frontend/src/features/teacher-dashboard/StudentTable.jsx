import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';

export function StudentTable({ students = [], limit, search = '' }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const riskLabel = { stable: [t('studentTable.stable'), 'bg-mint-100 text-mint-700'], attention: [t('studentTable.attention'), 'status-warning'], risk: [t('studentTable.risk'), 'status-danger'] };
  const filtered = students.filter((student) => student.name.toLowerCase().includes(search.toLowerCase()));
  const rows = limit ? filtered.slice(0, limit) : filtered;
  if (!rows.length) return <p className="py-8 text-center text-sm text-stone-500">{t('studentTable.empty')}</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-400"><th className="px-3 py-4">{t('studentTable.student')}</th><th className="px-3 py-4">{t('studentTable.progress')}</th><th className="px-3 py-4">{t('studentTable.activeDays')}</th><th className="px-3 py-4">{t('studentTable.focus')}</th><th className="px-3 py-4">{t('studentTable.status')}</th><th aria-label={t('studentTable.action')} /></tr></thead><tbody>{rows.map((student) => { const risk = riskLabel[student.risk] || riskLabel.attention; return <tr key={student.id} className="border-b border-stone-100 last:border-0"><td className="px-3 py-4 font-bold">{student.name}</td><td className="px-3 py-4 tabular-nums">{student.progress}%</td><td className="px-3 py-4 tabular-nums">{student.streak}</td><td className="px-3 py-4 text-sm text-stone-600">{student.focus}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${risk[1]}`}>{risk[0]}</span></td><td className="px-3 py-4"><button onClick={() => navigate(`/teacher/students/${student.id}`)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-stone-100" aria-label={t('studentTable.openProfile', { name: student.name })}><ChevronRight className="h-5 w-5" /></button></td></tr>; })}</tbody></table></div>;
}
