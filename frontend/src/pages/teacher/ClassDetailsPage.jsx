import { useState } from 'react';
import { Download, Search, UserPlus } from 'lucide-react';
import { Button, Card, Dialog, StatusToast } from '../../shared/ui';
import { ClassHeatmap } from '../../features/teacher-dashboard/ClassHeatmap';
import { StudentTable } from '../../features/teacher-dashboard/StudentTable';

export function ClassDetailsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  const exportClass = () => {
    const content = 'Ученик,Прогресс,Серия,Фокус\nАйару С.,78%,12,Разложение на множители\nДанияр К.,84%,8,Квадратные уравнения';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    link.download = 'sanaq-9a-progress.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setToast('Отчёт класса подготовлен в формате CSV');
  };

  return <div className="mx-auto max-w-7xl animate-rise"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Мои классы</p><h1 className="page-title mt-3">9A · Математика</h1><p className="mt-3 text-stone-600">24 ученика · код подключения <strong>9A-SANAQ</strong></p></div><div className="flex gap-2"><Button variant="outline" onClick={exportClass}><Download className="h-4 w-4" /> Экспорт</Button><Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4" /> Добавить</Button></div></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><Card className="p-6 sm:p-8"><h2 className="text-2xl font-extrabold">Освоение навыков</h2><div className="mt-7"><ClassHeatmap /></div></Card><Card className="p-6 sm:p-8"><p className="eyebrow">Приоритет недели</p><h2 className="mt-2 text-2xl font-extrabold">Разложение на множители</h2><p className="mt-4 text-stone-600">Среднее освоение — 55%. Навык влияет на две следующие темы и подготовку к экзамену.</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-lavender-100 p-4"><p className="font-display text-2xl font-semibold">14</p><p className="text-sm text-stone-600">нужна практика</p></div><div className="rounded-2xl bg-mint-100 p-4"><p className="font-display text-2xl font-semibold">10</p><p className="text-sm text-stone-600">готовы дальше</p></div></div></Card></div><Card className="mt-6 p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-extrabold">Список учеников</h2><label className="relative block"><span className="sr-only">Поиск ученика</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field-control pl-11 sm:w-72" placeholder="Найти ученика" /></label></div>{search && <p className="mt-4 text-sm text-stone-500">Результаты по запросу «{search}»</p>}<div className="mt-4"><StudentTable /></div></Card>
    <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Добавить ученика" description="Ученик получит приглашение и присоединится к классу 9A." footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Отмена</Button><Button onClick={() => { setAddOpen(false); setToast('Приглашение ученику отправлено'); }}>Отправить приглашение</Button></>}>
      <div className="space-y-5"><div><label className="field-label" htmlFor="student-name">Имя ученика</label><input id="student-name" className="field-control" placeholder="Например, Мадина К." /></div><div><label className="field-label" htmlFor="student-email">Email ученика или родителя</label><input id="student-email" type="email" className="field-control" placeholder="student@example.com" /></div><div className="rounded-2xl bg-lavender-50 p-4 text-sm text-stone-600">Альтернатива: передайте ученику код класса <strong className="text-ink">9A-SANAQ</strong>.</div></div>
    </Dialog>
    <StatusToast message={toast} onClose={() => setToast('')} />
  </div>;
}
