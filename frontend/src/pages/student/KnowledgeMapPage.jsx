import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDot, LockKeyhole, RotateCcw } from 'lucide-react';
import { Button, Card, Dialog, ProgressBar } from '../../shared/ui';
import { knowledgeMapApi } from '../../features/knowledge-map/knowledgeMapApi';
import { learningPathApi } from '../../features/learning-path/learningPathApi';
import { useI18n } from '../../shared/i18n/i18n';

export function KnowledgeMapPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const groups = [['mastered', t('knowledgeMap.mastered'), CheckCircle2, 'mint'], ['learning', t('knowledgeMap.learning'), CircleDot, 'violet'], ['locked', t('knowledgeMap.locked'), LockKeyhole, 'violet']];
  const [nodes, setNodes] = useState([]);
  const [nextStep, setNextStep] = useState(null);
  const [pathId, setPathId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [map, paths] = await Promise.all([knowledgeMapApi.get(), learningPathApi.list()]);
        if (!active) return;
        setNodes(map.data.nodes || []);
        const currentPathId = paths.data.items?.[0]?.id;
        setPathId(currentPathId || null);
        if (currentPathId) {
          const step = await learningPathApi.nextStep(currentPathId);
          if (active) setNextStep(step.data.step);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const normalizedStatus = (node) => {
    if (node.status === 'locked') return 'locked';
    if (node.mastery >= 0.8) return 'mastered';
    return 'learning';
  };

  if (loading) return <div className="mx-auto max-w-6xl py-16 text-center font-bold">{t('knowledgeMap.loading')}</div>;

  return <div className="mx-auto max-w-6xl animate-rise"><div><p className="eyebrow">{t('knowledgeMap.eyebrow')}</p><h1 className="page-title mt-3">{t('knowledgeMap.title')}</h1><p className="mt-3 text-stone-600">{t('knowledgeMap.description')}</p></div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}
    {nextStep && <Card className="mt-7 border-lavender-300 bg-lavender-50 p-6 sm:p-8"><p className="eyebrow">{t('knowledgeMap.recommended')}</p><h2 className="mt-2 text-2xl font-extrabold">{nextStep.skill_name}</h2><p className="mt-3 text-stone-600">{nextStep.reason}</p><Button className="mt-6" onClick={() => navigate(`/student/task/${nextStep.task_id}?path=${pathId}`)}>{t('knowledgeMap.continue')} <ArrowRight className="h-5 w-5" /></Button></Card>}
    <div className="mt-7 grid gap-6 lg:grid-cols-3">{groups.map(([status, title, Icon, tone]) => { const items = nodes.filter((node) => normalizedStatus(node) === status); return <section key={status}><div className="mb-3 flex items-center gap-2"><Icon className="h-5 w-5 text-lavender-600" /><h2 className="text-lg font-extrabold">{title}</h2><span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-bold">{items.length}</span></div><div className="grid gap-3">{items.map((node) => <button key={node.id} onClick={() => setSelected(node)} className="rounded-3xl border border-stone-200 bg-paper p-5 text-left hover:border-lavender-300"><div className="flex items-start justify-between gap-3"><strong>{node.name}</strong><span className="text-sm font-bold text-stone-500">{Math.round(node.mastery * 100)}%</span></div><p className="mt-2 text-xs text-stone-500">{node.topic_name}</p><ProgressBar className="mt-4" value={Math.round(node.mastery * 100)} tone={tone} /></button>)}</div></section>; })}</div>
    {!nodes.length && !error && <Card className="mt-7 p-8 text-center">{t('knowledgeMap.empty')}</Card>}
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || ''} description={selected?.topic_name || ''} footer={<><Button variant="ghost" onClick={() => setSelected(null)}>{t('knowledgeMap.close')}</Button>{selected && normalizedStatus(selected) !== 'locked' && nextStep?.skill_id === selected.id && <Button onClick={() => navigate(`/student/task/${nextStep.task_id}?path=${pathId}`)}>{normalizedStatus(selected) === 'mastered' ? <><RotateCcw className="h-5 w-5" /> {t('knowledgeMap.review')}</> : <>{t('knowledgeMap.continue')} <ArrowRight className="h-5 w-5" /></>}</Button>}</>}><p className="text-stone-600">{t(`knowledgeMap.mastery.${normalizedStatus(selected || {})}`)}. {t('knowledgeMap.confidence', { value: Math.round((selected?.confidence || 0) * 100) })}</p>{selected?.blocked_by?.length > 0 && <p className="mt-3 text-sm text-stone-500">{t('knowledgeMap.blockedBy', { skills: selected.blocked_by.join(', ') })}</p>}</Dialog>
  </div>;
}
