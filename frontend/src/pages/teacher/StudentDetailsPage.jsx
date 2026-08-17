import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Mail, MessageSquareText, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Dialog, ProgressBar, StatusToast } from '../../shared/ui';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';
import { useI18n } from '../../shared/i18n/i18n';

export function StudentDetailsPage() {
  const { t } = useI18n();
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
      setCommentOpen(false); setMessage(''); setToast(t('studentDetails.saved')); await load();
    } catch (requestError) { setError(requestError.message); setLoading(false); }
  };

  const student = data?.student; const progress = data?.progress;
  return <div className="mx-auto max-w-6xl animate-rise"><button onClick={() => navigate(-1)} className="mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> {t('studentDetails.back')}</button>{error && <div className="state-error mb-5" role="alert">{error}</div>}{loading && !data ? <Card className="p-10 text-center">{t('studentDetails.loading')}</Card> : data && <><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-lavender-200 text-xl font-extrabold text-lavender-700">{student.name[0]}</span><div className="min-w-0"><p className="eyebrow">{t('studentDetails.student')}</p><h1 className="mt-1 break-words text-3xl font-extrabold">{student.name}</h1><p className="break-words text-stone-500">{progress.focus}</p></div></div><Button className="w-full sm:w-auto" variant="outline" onClick={() => setCommentOpen(true)}><MessageSquareText className="h-5 w-5" /> {t('studentDetails.comment')}</Button></div><div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]"><div className="space-y-6"><Card className="p-6"><Target className="h-6 w-6 text-lavender-600" /><p className="mt-5 text-sm text-stone-500">{t('studentDetails.overall')}</p><p className="font-display text-4xl font-semibold">{progress.progress}%</p><ProgressBar className="mt-5" value={progress.progress} /></Card><Card className="p-6"><h2 className="text-xl font-extrabold">{t('studentDetails.contacts')}</h2><p className="mt-4 flex min-w-0 items-center gap-3 break-all text-sm text-stone-600"><Mail className="h-5 w-5 shrink-0" /> {student.email}</p></Card></div><Card className="p-6 sm:p-8"><p className="eyebrow">{t('studentDetails.skills')}</p><h2 className="mt-2 text-2xl font-extrabold">{t('studentDetails.current')}</h2><div className="mt-7 space-y-6">{progress.skills.map((skill) => <ProgressBar key={skill.id} value={Math.round(skill.mastery * 100)} label={skill.name} tone={skill.mastery >= 0.8 ? 'mint' : skill.mastery < 0.45 ? 'coral' : 'violet'} />)}</div>{data.comments?.length > 0 && <div className="mt-8 rounded-2xl bg-lavender-50 p-5"><p className="font-bold">{t('studentDetails.latest')}</p><p className="mt-2 break-words text-sm text-stone-700">{data.comments[0].message}</p></div>}</Card></div></>}
    <Dialog open={commentOpen} onClose={() => setCommentOpen(false)} title={t('studentDetails.dialogTitle')} description={t('studentDetails.dialogDescription')} footer={<><Button variant="ghost" onClick={() => setCommentOpen(false)}>{t('studentDetails.cancel')}</Button><Button loading={loading} disabled={!message.trim()} onClick={submitComment}>{t('studentDetails.send')}</Button></>}><div><label className="field-label" htmlFor="teacher-comment">{t('studentDetails.message')}</label><textarea id="teacher-comment" rows="5" className="field-control py-3" value={message} onChange={(event) => setMessage(event.target.value)} /><label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={addToPlan} onChange={(event) => setAddToPlan(event.target.checked)} className="h-5 w-5 accent-lavender-600" /> {t('studentDetails.addToPlan')}</label></div></Dialog><StatusToast message={toast} onClose={() => setToast('')} /></div>;
}
