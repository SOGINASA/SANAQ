import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../shared/i18n/i18n';

export function WeakSkillsList() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const skills = [
    { title: t('weakSkills.factoring'), value: 58, action: t('weakSkills.inProgress') },
    { title: t('weakSkills.discriminant'), value: 46, action: t('weakSkills.review') },
    { title: t('weakSkills.graphs'), value: 71, action: t('weakSkills.practice') },
  ];
  return <div className="space-y-3">{skills.map((skill, index) => <div key={skill.title} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? 'status-danger' : 'bg-stone-100 text-stone-600'}`}><AlertCircle className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold">{skill.title}</p><p className="text-sm text-stone-500">{t('weakSkills.mastery', { value: skill.value })}</p></div><button onClick={() => navigate(index === 0 ? '/student/learn/factorization' : '/student/task/review')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-lavender-100" aria-label={`${skill.action}: ${skill.title}`}><ArrowUpRight className="h-5 w-5" /></button></div>)}</div>;
}
