import { useEffect, useState } from 'react';
import { Download, Search, UserPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button, Card, StatusToast } from '../../shared/ui';
import { ClassHeatmap } from '../../features/teacher-dashboard/ClassHeatmap';
import { StudentTable } from '../../features/teacher-dashboard/StudentTable';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';

export function ClassDetailsPage() {
  const { classId } = useParams();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [weakSkills, setWeakSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([teacherApi.classDetails(classId), teacherApi.students(classId), teacherApi.analytics(classId), teacherApi.weakSkills(classId)])
      .then(([details, studentResponse, analyticsResponse, weakResponse]) => {
        setClassroom(details.data.class); setStudents(studentResponse.data.items || []);
        setAnalytics(analyticsResponse.data); setWeakSkills(weakResponse.data.items || []);
      }).catch((requestError) => setError(requestError.message));
  }, [classId]);

  const exportClass = () => {
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const content = ['Ученик,Email,Прогресс,Активные дни,Фокус', ...students.map((item) => [item.name, item.email, `${item.progress}%`, item.streak, item.focus].map(escape).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${classroom?.name || 'class'}-students.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const copyCode = async () => { await navigator.clipboard?.writeText(classroom?.join_code || ''); setToast('Код подключения скопирован'); };
  const priority = weakSkills[0];
  return <div className="mx-auto max-w-7xl animate-rise">{error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Мои классы</p><h1 className="page-title mt-3">{classroom ? `${classroom.name} · ${classroom.grade} класс` : 'Загрузка класса…'}</h1><p className="mt-3 text-stone-600">{analytics?.student_count || 0} учеников · код <strong>{classroom?.join_code || '—'}</strong></p></div><div className="flex gap-2"><Button variant="outline" onClick={exportClass}><Download className="h-4 w-4" /> Экспорт</Button><Button onClick={copyCode}><UserPlus className="h-4 w-4" /> Копировать код</Button></div></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-2"><Card className="p-6 sm:p-8"><h2 className="text-2xl font-extrabold">Освоение навыков</h2><div className="mt-7"><ClassHeatmap students={students} /></div></Card><Card className="p-6 sm:p-8"><p className="eyebrow">Приоритет класса</p><h2 className="mt-2 text-2xl font-extrabold">{priority?.name || 'Недостаточно данных'}</h2><p className="mt-4 text-stone-600">Среднее освоение — {Math.round((priority?.mastery || 0) * 100)}%. Ниже порога: {priority?.students_below_threshold || 0} учеников.</p><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-lavender-100 p-4"><p className="font-display text-2xl font-semibold">{analytics?.average_mastery || 0}%</p><p className="text-sm text-stone-600">средний mastery</p></div><div className="rounded-2xl bg-mint-100 p-4"><p className="font-display text-2xl font-semibold">{analytics?.active_students || 0}</p><p className="text-sm text-stone-600">активных</p></div></div></Card></div>
    <Card className="mt-6 p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-extrabold">Список учеников</h2><label className="relative block"><span className="sr-only">Поиск ученика</span><Search className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field-control pl-11 sm:w-72" placeholder="Найти ученика" /></label></div><div className="mt-4"><StudentTable students={students} search={search} /></div></Card><StatusToast message={toast} onClose={() => setToast('')} /></div>;
}
