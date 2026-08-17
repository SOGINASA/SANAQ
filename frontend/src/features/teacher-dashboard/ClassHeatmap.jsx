import { useI18n } from '../../shared/i18n/i18n';

const tone = (value) => value >= 0.75 ? 'bg-mint-300' : value >= 0.5 ? 'bg-lavender-300' : value >= 0.35 ? 'bg-danger-100' : 'bg-coral';

export function ClassHeatmap({ students = [] }) {
  const { t } = useI18n();
  const skillMap = new Map();
  students.forEach((student) => student.skills?.forEach((skill) => { if (!skillMap.has(skill.id)) skillMap.set(skill.id, { name: skill.name, values: new Map() }); skillMap.get(skill.id).values.set(student.id, skill.mastery); }));
  const skills = [...skillMap.values()];
  const visibleStudents = students.slice(0, 5);
  if (!visibleStudents.length) return <p className="py-8 text-center text-sm text-stone-500">{t('heatmap.empty')}</p>;
  return <div className="overflow-x-auto"><div className="min-w-[520px]"><div className="grid gap-2 text-center text-xs font-bold text-stone-400" style={{ gridTemplateColumns: `minmax(130px,1.5fr) repeat(${visibleStudents.length},minmax(44px,1fr))` }}><span className="text-left">{t('heatmap.skill')}</span>{visibleStudents.map((student) => <span key={student.id}>{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>)}{skills.map((skill) => <div key={skill.name} className="contents"><span className="flex items-center text-left text-xs font-semibold text-stone-600">{skill.name}</span>{visibleStudents.map((student) => { const value = skill.values.get(student.id) || 0; return <div key={student.id} className={`heat-cell grid place-items-center text-xs font-extrabold text-ink ${tone(value)}`} title={`${skill.name}: ${Math.round(value * 100)}%`}>{Math.round(value * 100)}</div>; })}</div>)}</div><div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-stone-500"><span><i className="mr-2 inline-block h-3 w-3 rounded bg-mint-300" />75%+</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-lavender-300" />50–74%</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-coral" />{t('heatmap.below')}</span></div></div></div>;
}
