import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Mail, MessageSquareText, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';

export function StudentDetailsPage() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [addToPlan, setAddToPlan] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await teacherApi.studentProgress(studentId); setData(response.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [studentId]);
  useEffect(() => { load(); }, [load]);

  const submitComment = async () => {
    setLoading(true);
    try {
      await teacherApi.comment(studentId, { message, add_to_plan: addToPlan });
      setCommentOpen(false); setMessage(''); setToast('Комментарий сохранён и отправлен ученику'); await load();
    } catch (requestError) { setError(requestError.message); setLoading(false); }
  };

  const student = data?.student; const progress = data?.progress;
  return <div className="mx-auto max-w-6xl animate-rise"><button onClick={() => navigate(-1)} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> К классу</button>{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}{loading && !data ? <Card className="p-10 text-center">Загружаем профиль…</Card> : data && <><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="grid h-16 w-16 place-items-center rounded-3xl bg-lavender-200 text-xl font-extrabold text-lavender-700">{student.name[0]}</span><div><p className="eyebrow">Ученик</p><h1 className="mt-1 text-3xl font-extrabold">{student.name}</h1><p className="text-stone-500">{progress.focus}</p></div></div><Button variant="outline" onClick={() => setCommentOpen(true)}><MessageSquareText className="h-5 w-5" /> Оставить комментарий</Button></div><div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><div className="space-y-6"><Card className="p-6"><Target className="h-6 w-6 text-lavender-600" /><p className="mt-5 text-sm text-stone-500">Общее освоение</p><p className="font-display text-4xl font-semibold">{progress.progress}%</p><ProgressBar className="mt-5" value={progress.progress} /></Card><Card className="p-6"><h2 className="text-xl font-extrabold">Контакты</h2><p className="mt-4 flex items-center gap-3 text-sm text-stone-600"><Mail className="h-5 w-5" /> {student.email}</p></Card></div><Card className="p-6 sm:p-8"><p className="eyebrow">По навыкам</p><h2 className="mt-2 text-2xl font-extrabold">Текущий mastery</h2><div className="mt-7 space-y-6">{progress.skills.map((skill) => <ProgressBar key={skill.id} value={Math.round(skill.mastery * 100)} label={skill.name} tone={skill.mastery >= 0.8 ? 'mint' : skill.mastery < 0.45 ? 'coral' : 'violet'} />)}</div>{data.comments?.length > 0 && <div className="mt-8 rounded-2xl bg-lavender-50 p-5"><p className="font-bold">Последний комментарий</p><p className="mt-2 text-sm text-stone-700">{data.comments[0].message}</p></div>}</Card></div></>}
    <Dialog open={commentOpen} onClose={() => setCommentOpen(false)} title="Комментарий ученику" description="Комментарий сохранится в backend и создаст уведомление ученику." footer={<><Button variant="ghost" onClick={() => setCommentOpen(false)}>Отмена</Button><Button loading={loading} disabled={!message.trim()} onClick={submitComment}>Отправить</Button></>}><div><label className="field-label" htmlFor="teacher-comment">Сообщение</label><textarea id="teacher-comment" rows="5" className="field-control py-3" value={message} onChange={(event) => setMessage(event.target.value)} /><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={addToPlan} onChange={(event) => setAddToPlan(event.target.checked)} className="h-5 w-5 accent-lavender-600" /> Добавить в план</label></div></Dialog><StatusToast message={toast} onClose={() => setToast('')} /></div>;
}
