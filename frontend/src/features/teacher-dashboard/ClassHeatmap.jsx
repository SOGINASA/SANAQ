import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';

const tone = (value) => value >= 0.75 ? 'bg-mint-300' : value >= 0.5 ? 'bg-lavender-300' : value >= 0.35 ? 'bg-danger-100' : 'bg-coral';
const riskOrder = { risk: 0, attention: 1, stable: 2 };

export function ClassHeatmap({ students = [], onStudentSelect }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [weakOnly, setWeakOnly] = useState(false);
  const skillMap = new Map();
  students.forEach((student) => student.skills?.forEach((skill) => {
    if (!skillMap.has(skill.id)) skillMap.set(skill.id, { id: skill.id, name: skill.name, values: new Map() });
    skillMap.get(skill.id).values.set(student.id, skill.mastery);
  }));
  const sortedStudents = [...students].sort((left, right) => (riskOrder[left.risk] ?? 3) - (riskOrder[right.risk] ?? 3) || left.progress - right.progress);
  const visibleStudents = sortedStudents.slice(0, 5);
  const allSkills = [...skillMap.values()].map((skill) => ({ ...skill, average: visibleStudents.length ? visibleStudents.reduce((sum, student) => sum + (skill.values.get(student.id) || 0), 0) / visibleStudents.length : 0 }));
  const skills = (weakOnly ? allSkills.filter((skill) => skill.average < 0.75) : allSkills).sort((left, right) => left.average - right.average);
  if (!visibleStudents.length) return <p className="py-8 text-center text-sm text-stone-500">{t('heatmap.empty')}</p>;

  const openStudent = (student) => onStudentSelect ? onStudentSelect(student) : navigate(`/teacher/students/${student.id}`);
  const legend = <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-stone-500"><span><i className="mr-2 inline-block h-3 w-3 rounded bg-mint-300" />75%+</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-lavender-300" />50–74%</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-coral" />{t('heatmap.below')}</span></div>;

  return <div className="min-w-0 max-w-full">
    <div className="mb-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-stone-500">{t('teacher.needHelp')}: {allSkills.filter((skill) => skill.average < 0.75).length}</p><button type="button" aria-pressed={weakOnly} onClick={() => setWeakOnly((value) => !value)} className={`min-h-10 rounded-xl px-3 text-xs font-bold transition ${weakOnly ? 'bg-lavender-100 text-lavender-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{t('teacher.needHelp')}</button></div>
    <div className="grid gap-3 sm:hidden">{skills.map((skill, skillIndex) => <section key={skill.id} className="min-w-0 rounded-2xl bg-stone-50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="break-words text-sm font-bold text-stone-700">{skill.name}</h3><span className="text-xs font-bold text-stone-400">{Math.round(skill.average * 100)}%</span></div><div className="mt-3 grid grid-cols-2 gap-2">{visibleStudents.map((student, studentIndex) => { const value = skill.values.get(student.id) || 0; return <button type="button" key={student.id} onClick={() => openStudent(student)} className="min-w-0 rounded-xl bg-paper p-3 text-left transition hover:ring-2 hover:ring-lavender-300"><span className="block truncate text-xs font-semibold text-stone-500">{student.name}</span><span style={{ '--cell-index': skillIndex + studentIndex }} className={`heat-cell-motion mt-2 flex h-9 items-center justify-center rounded-lg text-xs font-extrabold text-ink ${tone(value)}`}>{Math.round(value * 100)}%</span></button>; })}</div></section>)}{legend}</div>
    <div className="hidden max-w-full overflow-x-auto overscroll-x-contain sm:block" tabIndex="0" role="region" aria-label={t('heatmap.scrollRegion')}><div className="min-w-[620px]"><div className="heatmap-grid grid gap-2 text-center text-xs font-bold text-stone-400" style={{ gridTemplateColumns: `minmax(160px,1.5fr) repeat(${visibleStudents.length},minmax(58px,1fr))` }}><span className="heatmap-sticky-label text-left">{t('heatmap.skill')}</span>{visibleStudents.map((student) => <button type="button" onClick={() => openStudent(student)} className="min-h-10 rounded-xl px-1 transition hover:bg-lavender-50 hover:text-lavender-700" key={student.id} title={student.name}>{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</button>)}{skills.map((skill, skillIndex) => <div key={skill.id} className="contents"><span className="heatmap-sticky-label flex items-center justify-between gap-2 text-left text-xs font-semibold text-stone-600"><span className="truncate">{skill.name}</span><small className="text-[10px] text-stone-400">{Math.round(skill.average * 100)}%</small></span>{visibleStudents.map((student, studentIndex) => { const value = skill.values.get(student.id) || 0; return <button type="button" key={student.id} onClick={() => openStudent(student)} style={{ '--cell-index': skillIndex + studentIndex }} className={`heat-cell heat-cell-motion grid place-items-center text-xs font-extrabold text-ink focus:z-10 ${tone(value)}`} title={`${student.name} · ${skill.name}: ${Math.round(value * 100)}%`}>{Math.round(value * 100)}</button>; })}</div>)}</div>{legend}</div></div>
  </div>;
}
