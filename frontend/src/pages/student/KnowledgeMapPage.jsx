import { Info, LockKeyhole, Sparkles } from 'lucide-react';
import { Card } from '../../shared/ui';
import { knowledgeNodes } from '../../shared/data/mockData';

const nodeTone = { mastered: 'bg-mint-300 text-ink', learning: 'bg-lavender-300 text-ink', locked: 'bg-stone-300 text-stone-600' };

export function KnowledgeMapPage() {
  return <div className="mx-auto max-w-6xl animate-rise"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Математика · 9 класс</p><h1 className="page-title mt-3">Созвездие знаний</h1><p className="mt-3 max-w-2xl text-stone-600">Каждый узел — навык. Связи показывают, что нужно освоить раньше.</p></div><div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-mint-300 px-3 py-2">Освоено</span><span className="rounded-full bg-lavender-300 px-3 py-2">В работе</span><span className="rounded-full bg-stone-300 px-3 py-2">Закрыто</span></div></div>
    <Card className="knowledge-map mt-8"><div className="absolute left-[18%] top-[25%] h-[2px] w-[35%] rotate-[8deg] bg-lavender-300" /><div className="absolute left-[34%] top-[47%] h-[2px] w-[30%] -rotate-[8deg] bg-lavender-300" /><div className="absolute left-[23%] top-[63%] h-[2px] w-[47%] rotate-[12deg] bg-stone-300" />{knowledgeNodes.map((node) => <button key={node.id} style={{ left: `${node.x}%`, top: `${node.y}%` }} className={`knowledge-node ${nodeTone[node.status]}`} aria-label={`${node.title}, освоено ${node.mastery}%${node.status === 'locked' ? ', закрыто' : ''}`}><span>{node.status === 'locked' ? <LockKeyhole className="mx-auto mb-1 h-4 w-4" /> : <Sparkles className="mx-auto mb-1 h-4 w-4" />}{node.title}</span><span className="text-xs font-extrabold opacity-70">{node.mastery}%</span></button>)}</Card>
    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-lavender-100 p-4 text-sm text-lavender-800"><Info className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Почему «Графики функций» закрыты?</strong> Сначала достигни 70% в квадратных уравнениях. SANAQ откроет тему автоматически.</p></div>
  </div>;
}
