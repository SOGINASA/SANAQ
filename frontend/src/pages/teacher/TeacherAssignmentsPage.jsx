import { CalendarClock, CheckCircle2, Plus, Users } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';

export function TeacherAssignmentsPage() {
  const assignments = [
    { title: 'Разность квадратов · практика', group: '9A', due: '20 августа', progress: 67 },
    { title: 'Диагностика по функциям', group: '9A', due: '24 августа', progress: 29 },
    { title: 'Повторение линейных уравнений', group: '9Б', due: 'Завершено', progress: 100 },
  ];
  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">План класса</p><h1 className="page-title mt-3">Назначения</h1><p className="mt-3 text-stone-600">Материалы, дедлайны и выполнение в одном месте.</p></div><Button><Plus className="h-5 w-5" /> Создать назначение</Button></div><div className="mt-8 grid gap-5">{assignments.map((item) => <Card key={item.title} className="p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.progress === 100 ? 'bg-mint-100 text-mint-700' : 'bg-lavender-100 text-lavender-700'}`}>{item.progress === 100 ? <CheckCircle2 className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}</span><div className="flex-1"><h2 className="text-lg font-extrabold">{item.title}</h2><p className="mt-1 flex items-center gap-2 text-sm text-stone-500"><Users className="h-4 w-4" /> {item.group} · {item.due}</p><ProgressBar className="mt-4 max-w-2xl" value={item.progress} /></div><button className="min-h-11 rounded-xl px-4 text-sm font-bold text-lavender-700">Открыть</button></div></Card>)}</div></div>;
}
