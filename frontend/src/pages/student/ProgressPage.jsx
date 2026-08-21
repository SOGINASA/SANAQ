import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarClock, RefreshCw, Target } from 'lucide-react';
import { Card, ProgressBar } from '../../shared/ui';
import { progressApi } from '../../features/progress/progressApi';
import { reviewsApi } from '../../features/spaced-repetition/reviewsApi';
import { teacherApi } from '../../features/teacher-dashboard/teacherApi';
import { useI18n } from '../../shared/i18n/i18n';

export function ProgressPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [weakSkills, setWeakSkills] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([progressApi.summary(), progressApi.topics(), progressApi.weakSkills(), reviewsApi.due(), teacherApi.studentAssignments()])
      .then(([summaryResponse, topicsResponse, weakResponse, reviewsResponse, assignmentsResponse]) => {
        setSummary(summaryResponse.data);
        setTopics(topicsResponse.data.items || []);
        setWeakSkills(weakResponse.data.items || []);
        setReviews(reviewsResponse.data.items || []);
        setAssignments(assignmentsResponse.data.items || []);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const beginReview = async (review) => {
    if (!review.task_id) return setError(t('progressPage.noTask'));
    setError('');
    try {
      await reviewsApi.start(review.id);
      navigate(`/student/task/${review.task_id}?review=${review.id}`);
    } catch (requestError) { setError(requestError.message); }
  };
  const openAssignment = (assignment) => assignment.task_id ? navigate(`/student/task/${assignment.task_id}`) : assignment.module_id && navigate(`/student/learn/${assignment.module_id}`);
  const mastery = Math.round((summary?.overall_mastery || 0) * 100);

  return <div className="mx-auto max-w-6xl animate-rise">
    <div><p className="eyebrow">{t('progressPage.eyebrow')}</p><h1 className="page-title mt-3">{t('progressPage.title')}</h1><p className="mt-3 text-stone-600">{t('progressPage.description')}</p></div>
    {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    <div className="mt-8 grid gap-5 sm:grid-cols-3"><Card className="p-6"><Target className="h-6 w-6 text-lavender-600" /><p className="mt-5 text-sm text-stone-500">{t('progressPage.overall')}</p><p className="font-display text-4xl font-semibold">{mastery}%</p><ProgressBar className="mt-4" value={mastery} /></Card><Card className="p-6"><ArrowUpRight className="h-6 w-6 text-mint-700" /><p className="mt-5 text-sm text-stone-500">{t('progressPage.mastered')}</p><p className="font-display text-4xl font-semibold">{summary?.mastered_skills || 0}/{summary?.total_skills || 0}</p></Card><Card className="p-6"><p className="text-sm text-stone-500">{t('progressPage.attention')}</p><p className="mt-5 font-display text-4xl font-semibold">{summary?.weak_skills || 0}</p></Card></div>
    {(assignments.length > 0 || reviews.length > 0) && <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card className="p-6 sm:p-8"><div className="flex items-center gap-3"><CalendarClock className="h-6 w-6 shrink-0 text-lavender-600" /><h2 className="text-2xl font-extrabold">{t('progressPage.assignments')}</h2></div><div className="mt-5 grid gap-3">{assignments.map((assignment) => <button key={assignment.id} onClick={() => openAssignment(assignment)} className="flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-2xl bg-stone-100 p-4 text-left hover:bg-lavender-50"><span className="min-w-0"><strong className="block break-words">{assignment.title}</strong><span className="mt-1 block break-words text-xs text-stone-500">{assignment.class_name}{assignment.due_at ? ` · ${t('progressPage.due', { date: new Date(assignment.due_at).toLocaleDateString(locale) })}` : ''}</span></span><ArrowRight className="h-5 w-5 shrink-0" /></button>)}{!assignments.length && <p className="text-sm text-stone-500">{t('progressPage.noAssignments')}</p>}</div></Card>
      <Card className="p-6 sm:p-8"><div className="flex items-center gap-3"><RefreshCw className="h-6 w-6 shrink-0 text-mint-700" /><h2 className="text-2xl font-extrabold">{t('progressPage.reviews')}</h2></div><div className="mt-5 grid gap-3">{reviews.map((review) => <button key={review.id} onClick={() => beginReview(review)} className="flex min-h-16 min-w-0 items-center justify-between gap-3 rounded-2xl bg-mint-50 p-4 text-left hover:bg-mint-100"><span className="min-w-0"><strong className="block break-words">{review.skill_name}</strong><span className="mt-1 block break-words text-xs text-stone-500">{t('progressPage.currentMastery', { value: Math.round(review.mastery * 100) })}</span></span><ArrowRight className="h-5 w-5 shrink-0" /></button>)}{!reviews.length && <p className="text-sm text-stone-500">{t('progressPage.noReviews')}</p>}</div></Card>
    </div>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Card className="p-6 sm:p-8"><h2 className="text-2xl font-extrabold">{t('progressPage.byTopic')}</h2><div className="mt-6 grid gap-5">{topics.map((topic) => <ProgressBar key={topic.topic_id} value={Math.round(topic.mastery * 100)} label={`${topic.name} · ${topic.mastered_skills}/${topic.total_skills}`} tone={topic.mastery >= 0.8 ? 'mint' : 'violet'} />)}</div></Card><Card className="p-6 sm:p-8"><h2 className="text-2xl font-extrabold">{t('progressPage.growth')}</h2><div className="mt-6 grid gap-3">{weakSkills.map((skill) => <div key={skill.skill_id} className="rounded-2xl bg-stone-100 p-4"><div className="flex justify-between gap-3"><strong className="break-words">{skill.name}</strong><span>{Math.round(skill.mastery * 100)}%</span></div><p className="mt-2 text-sm text-stone-500">{skill.reason}</p></div>)}</div></Card></div>
  </div>;
}
