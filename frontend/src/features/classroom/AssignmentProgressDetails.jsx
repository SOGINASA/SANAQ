import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { ProgressBar } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

const statusCopy = {
  completed: { labelKey: 'assignmentProgress.completedLabel', badgeKey: 'assignmentProgress.completedBadge', icon: CheckCircle2, tone: 'bg-mint-100 text-mint-700' },
  in_progress: { labelKey: 'assignmentProgress.inProgressLabel', badgeKey: 'assignmentProgress.inProgressBadge', icon: Clock3, tone: 'bg-lavender-100 text-lavender-700' },
  not_started: { labelKey: 'assignmentProgress.notStartedLabel', badgeKey: 'assignmentProgress.notStartedBadge', icon: Circle, tone: 'bg-paper text-stone-500' },
};

export function AssignmentProgressDetails({ assignment }) {
  const { t } = useI18n();
  const students = assignment?.student_progress || [];
  return <>
    <ProgressBar value={assignment?.progress || 0} label={t('assignmentProgress.overall')} tone={assignment?.progress === 100 ? 'mint' : 'violet'} />
    <div className="mt-6 grid gap-2">{students.map((student) => {
      const status = statusCopy[student.status] || statusCopy.not_started;
      const Icon = status.icon;
      return <div key={student.student_id} className="flex flex-col gap-3 rounded-2xl bg-stone-100 p-4 sm:flex-row sm:items-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${status.tone}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><strong className="block break-words">{student.name}</strong><span className="mt-1 block text-xs text-stone-500">{student.status === 'in_progress' ? t('assignmentProgress.studentParts', { status: t(status.labelKey), completed: student.completed_tasks, total: student.total_tasks }) : t(status.labelKey)}</span></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${status.tone}`}>{t(status.badgeKey)} · {student.progress}%</span></div>;
    })}{!students.length && <p className="text-sm text-stone-500">{t('assignmentProgress.noStudents')}</p>}</div>
  </>;
}
