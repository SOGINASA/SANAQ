import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function WeakSkillsList() {
  const navigate = useNavigate();
  const skills = [
    { title: 'Разложение на множители', value: 58, action: 'В работе' },
    { title: 'Дискриминант', value: 46, action: 'Повторить' },
    { title: 'Чтение графиков', value: 71, action: 'Закрепить' },
  ];
  return <div className="space-y-3">{skills.map((skill, index) => <div key={skill.title} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-[#FFE8E2] text-[#A74735]' : 'bg-stone-100 text-stone-600'}`}><AlertCircle className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold">{skill.title}</p><p className="text-sm text-stone-500">Освоено на {skill.value}%</p></div><button onClick={() => navigate(index === 0 ? '/student/learn/factorization' : '/student/task/review')} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 hover:bg-lavender-100" aria-label={`${skill.action}: ${skill.title}`}><ArrowUpRight className="h-5 w-5" /></button></div>)}</div>;
}
