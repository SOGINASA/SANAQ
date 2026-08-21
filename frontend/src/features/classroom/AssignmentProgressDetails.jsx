import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { ProgressBar } from '../../shared/ui';

const statusCopy = {
  completed: { label: 'Завершил всё назначение', badge: 'Готово', icon: CheckCircle2, tone: 'bg-mint-100 text-mint-700' },
  in_progress: { label: 'В процессе', badge: 'В работе', icon: Clock3, tone: 'bg-lavender-100 text-lavender-700' },
  not_started: { label: 'Ещё не начинал', badge: 'Не начато', icon: Circle, tone: 'bg-paper text-stone-500' },
};

export function AssignmentProgressDetails({ assignment }) {
  const students = assignment?.student_progress || [];
  return <>
    <ProgressBar value={assignment?.progress || 0} label="Общий прогресс по всем частям" tone={assignment?.progress === 100 ? 'mint' : 'violet'} />
    <div className="mt-6 grid gap-2">{students.map((student) => {
      const status = statusCopy[student.status] || statusCopy.not_started;
      const Icon = status.icon;
      return <div key={student.student_id} className="flex flex-col gap-3 rounded-2xl bg-stone-100 p-4 sm:flex-row sm:items-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${status.tone}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><strong className="block break-words">{student.name}</strong><span className="mt-1 block text-xs text-stone-500">{student.status === 'in_progress' ? `${status.label} · выполнено ${student.completed_tasks}/${student.total_tasks}` : status.label}</span></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${status.tone}`}>{status.badge} · {student.progress}%</span></div>;
    })}{!students.length && <p className="text-sm text-stone-500">В классе пока нет учеников.</p>}</div>
  </>;
}
