import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const riskLabel = { stable: ['Стабильно', 'bg-mint-100 text-mint-700'], attention: ['Наблюдать', 'bg-lime/30 text-[#52670A]'], risk: ['Нужна помощь', 'bg-[#FFE8E2] text-[#9B3D2D]'] };

export function StudentTable({ students = [], limit, search = '' }) {
  const navigate = useNavigate();
  const filtered = students.filter((student) => student.name.toLowerCase().includes(search.toLowerCase()));
  const rows = limit ? filtered.slice(0, limit) : filtered;
  if (!rows.length) return <p className="py-8 text-center text-sm text-stone-500">Ученики ещё не присоединились к классу.</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-400"><th className="px-3 py-4">Ученик</th><th className="px-3 py-4">Прогресс</th><th className="px-3 py-4">Активные дни</th><th className="px-3 py-4">Фокус</th><th className="px-3 py-4">Статус</th><th aria-label="Действие" /></tr></thead><tbody>{rows.map((student) => { const risk = riskLabel[student.risk] || riskLabel.attention; return <tr key={student.id} className="border-b border-stone-100 last:border-0"><td className="px-3 py-4 font-bold">{student.name}</td><td className="px-3 py-4 tabular-nums">{student.progress}%</td><td className="px-3 py-4 tabular-nums">{student.streak}</td><td className="px-3 py-4 text-sm text-stone-600">{student.focus}</td><td className="px-3 py-4"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${risk[1]}`}>{risk[0]}</span></td><td className="px-3 py-4"><button onClick={() => navigate(`/teacher/students/${student.id}`)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-stone-100" aria-label={`Открыть профиль ${student.name}`}><ChevronRight className="h-5 w-5" /></button></td></tr>; })}</tbody></table></div>;
}
