import { useState } from 'react';
import { CalendarClock, CheckCircle2, Plus, Users } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';

const initialAssignments = [
  { title: 'Разность квадратов · практика', group: '9A', due: '20 августа', progress: 67 },
  { title: 'Диагностика по функциям', group: '9A', due: '24 августа', progress: 29 },
  { title: 'Повторение линейных уравнений', group: '9Б', due: 'Завершено', progress: 100 },
];

export function TeacherAssignmentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');

  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">План класса</p><h1 className="page-title mt-3">Назначения</h1><p className="mt-3 text-stone-600">Материалы, дедлайны и выполнение в одном месте.</p></div><Button onClick={() => setCreateOpen(true)}><Plus className="h-5 w-5" /> Создать назначение</Button></div><div className="mt-8 grid gap-5">{initialAssignments.map((item) => <Card key={item.title} className="p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${item.progress === 100 ? 'bg-mint-100 text-mint-700' : 'bg-lavender-100 text-lavender-700'}`}>{item.progress === 100 ? <CheckCircle2 className="h-6 w-6" /> : <CalendarClock className="h-6 w-6" />}</span><div className="flex-1"><h2 className="text-lg font-extrabold">{item.title}</h2><p className="mt-1 flex items-center gap-2 text-sm text-stone-500"><Users className="h-4 w-4" /> {item.group} · {item.due}</p><ProgressBar className="mt-4 max-w-2xl" value={item.progress} /></div><button onClick={() => setSelected(item)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-lavender-700 hover:bg-lavender-50">Открыть</button></div></Card>)}</div>
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Новое назначение" description="Выберите материал, класс и срок выполнения." footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={() => { setCreateOpen(false); setToast('Назначение создано для класса 9A'); }}>Назначить классу</Button></>}>
      <div className="space-y-5"><div><label className="field-label" htmlFor="assignment-material">Материал</label><select id="assignment-material" className="field-control"><option>Разность квадратов · практика</option><option>Диагностика по функциям</option><option>Повторение линейных уравнений</option></select></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="assignment-class">Класс</label><select id="assignment-class" className="field-control"><option>9A</option><option>9Б</option></select></div><div><label className="field-label" htmlFor="assignment-date">Срок</label><input id="assignment-date" type="date" defaultValue="2026-08-24" className="field-control" /></div></div><label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-lavender-50 p-4 text-sm font-semibold"><input type="checkbox" defaultChecked className="h-5 w-5 accent-lavender-600" /> Автоматически напомнить ученикам за день</label></div>
    </Dialog>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} description={`${selected?.group || ''} · срок ${selected?.due || ''}`} footer={<><Button variant="ghost" onClick={() => setSelected(null)}>Закрыть</Button><Button onClick={() => { setSelected(null); setToast('Напоминание отправлено ученикам'); }}>Напомнить ученикам</Button></>}>
      {selected && <div><div className="grid grid-cols-3 gap-3">{[['Выполнили', `${Math.round(selected.progress * 0.24)}`], ['В процессе', '5'], ['Не начинали', `${Math.max(0, 19 - Math.round(selected.progress * 0.24))}`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-canvas p-4 text-center"><p className="text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div>)}</div><ProgressBar className="mt-6" value={selected.progress} label="Выполнение класса" /><div className="mt-6 rounded-2xl bg-mint-100 p-4 text-sm text-stone-700"><strong>Наблюдение:</strong> большинство ошибок связано с выбором формулы, а не с вычислениями.</div></div>}
    </Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
