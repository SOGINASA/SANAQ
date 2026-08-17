import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ChevronRight, CircleDot, LockKeyhole, RotateCcw, Sparkles } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar } from '../../shared/ui';
import { knowledgeNodes } from '../../shared/data/mockData';

const statusConfig = {
  mastered: { label: 'Освоено', icon: CheckCircle2, tone: 'bg-mint-100 text-mint-700' },
  learning: { label: 'Изучается', icon: CircleDot, tone: 'bg-lavender-100 text-lavender-700' },
  locked: { label: 'Пока закрыто', icon: LockKeyhole, tone: 'bg-stone-100 text-stone-500' },
};

function SkillRow({ node, onOpen, primary = false }) {
  const config = statusConfig[node.status];
  const Icon = config.icon;
  return (
    <button onClick={() => onOpen(node)} className={`flex min-h-24 w-full items-center gap-4 rounded-3xl border p-4 text-left transition sm:p-5 ${primary ? 'border-lavender-300 bg-lavender-50 shadow-soft' : 'border-stone-200 bg-paper hover:border-lavender-300'}`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${config.tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2"><span className="font-extrabold">{node.title}</span>{primary && <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-extrabold text-ink">ТЕКУЩИЙ ФОКУС</span>}</span>
        <span className="mt-1 block text-sm text-stone-500">{config.label} · {node.mastery}%</span>
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-stone-200"><span className={`block h-full rounded-full ${node.status === 'mastered' ? 'bg-mint-500' : node.status === 'learning' ? 'bg-lavender-500' : 'bg-stone-300'}`} style={{ width: `${Math.max(node.mastery, 5)}%` }} /></span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" />
    </button>
  );
}

export function KnowledgeMapPage() {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState(null);
  const mastered = knowledgeNodes.filter((node) => node.status === 'mastered');
  const learning = knowledgeNodes.filter((node) => node.status === 'learning');
  const locked = knowledgeNodes.filter((node) => node.status === 'locked');
  const currentNode = learning[0];

  return (
    <div className="mx-auto w-full max-w-6xl animate-rise overflow-x-hidden">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-lavender-100 px-3 py-1.5 text-xs font-extrabold text-lavender-700"><Sparkles className="h-4 w-4" /> Обновляется после каждого урока</div>
        <h1 className="page-title mt-4">Карта знаний</h1>
        <p className="mt-3 max-w-2xl text-stone-600">Здесь видно только главное: что уже получается, что ты изучаешь сейчас и какая тема откроется следующей.</p>
      </header>

      <section className="mt-7 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Сводка карты знаний">
        {[
          ['2', 'Освоено', 'bg-mint-100 text-mint-700'],
          ['2', 'Изучается', 'bg-lavender-100 text-lavender-700'],
          ['2', 'Закрыто', 'bg-stone-100 text-stone-600'],
        ].map(([value, label, tone]) => <div key={label} className={`rounded-2xl p-3 text-center sm:rounded-3xl sm:p-5 ${tone}`}><p className="font-display text-2xl font-semibold sm:text-3xl">{value}</p><p className="mt-1 text-[11px] font-bold sm:text-sm">{label}</p></div>)}
      </section>

      <section className="mt-8" aria-labelledby="focus-title">
        <div className="mb-4"><p className="eyebrow">Самое важное сейчас</p><h2 id="focus-title" className="mt-1 text-2xl font-extrabold">Текущий навык</h2></div>
        <Card className="overflow-hidden border-lavender-300">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-600 text-white"><CircleDot className="h-5 w-5" /></span><div><p className="text-xs font-extrabold uppercase tracking-wider text-lavender-700">Изучается сейчас</p><h3 className="mt-1 text-2xl font-extrabold sm:text-3xl">{currentNode.title}</h3><p className="mt-3 max-w-2xl leading-7 text-stone-600">Этот навык нужен, чтобы уверенно перейти к квадратным уравнениям.</p></div></div>
              <ProgressBar className="mt-7" value={currentNode.mastery} label="Освоение навыка" />
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button size="lg" onClick={() => navigate('/student/learn/factorization')} className="w-full sm:w-auto">Продолжить изучение <ArrowRight className="h-5 w-5" /></Button><Button size="lg" variant="ghost" onClick={() => setSelectedNode(currentNode)} className="w-full sm:w-auto">Подробнее</Button></div>
            </div>
            <div className="border-t border-stone-200 bg-lime/25 p-6 sm:p-8 lg:border-l lg:border-t-0"><p className="text-xs font-extrabold uppercase tracking-wider text-[#52670A]">Чтобы открыть дальше</p><p className="mt-4 text-xl font-extrabold">Набери ещё 12%</p><p className="mt-2 text-sm leading-6 text-stone-600">После короткой практики откроется следующий навык.</p><div className="mt-6 flex items-center gap-3 rounded-2xl bg-paper p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender-100 text-lavender-700"><ArrowRight className="h-5 w-5" /></span><span><span className="block text-xs text-stone-500">Следующая тема</span><span className="block text-sm font-extrabold">Квадратные уравнения</span></span></div></div>
          </div>
        </Card>
      </section>

      <section className="mt-9 grid gap-8 lg:grid-cols-2" aria-label="Все навыки">
        <div>
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint-100 text-mint-700"><Check className="h-5 w-5" /></span><div><h2 className="text-xl font-extrabold">Уже освоено</h2><p className="text-sm text-stone-500">Можно повторить в любой момент</p></div></div>
          <div className="space-y-3">{mastered.map((node) => <SkillRow key={node.id} node={node} onOpen={setSelectedNode} />)}</div>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-lavender-100 text-lavender-700"><CircleDot className="h-5 w-5" /></span><div><h2 className="text-xl font-extrabold">В процессе</h2><p className="text-sm text-stone-500">Двигаемся по очереди</p></div></div>
          <div className="space-y-3">{learning.map((node, index) => <SkillRow key={node.id} node={node} onOpen={setSelectedNode} primary={index === 0} />)}</div>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="later-title">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-stone-100 text-stone-500"><LockKeyhole className="h-5 w-5" /></span><div><h2 id="later-title" className="text-xl font-extrabold">Откроется позже</h2><p className="text-sm text-stone-500">Не нужно изучать всё одновременно</p></div></div>
        <div className="grid gap-3 md:grid-cols-2">{locked.map((node) => <SkillRow key={node.id} node={node} onOpen={setSelectedNode} />)}</div>
      </section>

      <Dialog open={Boolean(selectedNode)} onClose={() => setSelectedNode(null)} title={selectedNode?.title || ''} description="Подробности навыка" footer={<><Button variant="ghost" onClick={() => setSelectedNode(null)}>Закрыть</Button>{selectedNode?.status !== 'locked' && <Button onClick={() => navigate(selectedNode?.status === 'mastered' ? '/student/task/review' : `/student/learn/${selectedNode?.id}`)}>{selectedNode?.status === 'mastered' ? <><RotateCcw className="h-5 w-5" /> Повторить</> : <>Продолжить <ArrowRight className="h-5 w-5" /></>}</Button>}</>}>
        {selectedNode && <div><div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${statusConfig[selectedNode.status].tone}`}>{statusConfig[selectedNode.status].label}</span><span className="font-extrabold tabular-nums">{selectedNode.mastery}%</span></div><ProgressBar className="mt-5" value={selectedNode.mastery} /><div className="mt-6 rounded-3xl bg-canvas p-5"><p className="font-extrabold">Простыми словами</p><p className="mt-2 text-sm leading-7 text-stone-600">Навык считается освоенным, когда результат держится выше 70% и сохраняется после повторения.</p></div>{selectedNode.status === 'locked' && <div className="mt-4 flex gap-3 rounded-2xl bg-stone-100 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-stone-500" /><p className="text-sm leading-6 text-stone-600">Тема откроется автоматически после освоения предыдущего навыка. Сейчас ничего делать не нужно.</p></div>}</div>}
      </Dialog>
    </div>
  );
}
