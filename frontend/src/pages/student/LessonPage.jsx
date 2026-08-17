import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, Volume2 } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { contentApi } from '../../shared/api/contentApi';

export function LessonPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const moduleResponse = await contentApi.module(moduleId);
        if (!active) return;
        setModule(moduleResponse.data.module);
        const firstLesson = moduleResponse.data.module.lessons?.[0];
        if (firstLesson) {
          const lessonResponse = await contentApi.lesson(firstLesson.id);
          if (active) setLesson(lessonResponse.data.lesson);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [moduleId]);

  const chooseLesson = async (lessonId) => {
    setLoading(true);
    try { const response = await contentApi.lesson(lessonId); setLesson(response.data.lesson); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  const speak = () => {
    if (!lesson || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${lesson.title}. ${lesson.theory}. ${lesson.example}`));
  };

  if (loading && !module) return <div className="mx-auto max-w-5xl py-16 text-center font-bold">Загружаем модуль…</div>;

  return <div className="mx-auto max-w-5xl animate-rise"><button onClick={() => navigate('/student/path')} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-stone-600"><ArrowLeft className="h-5 w-5" /> К маршруту</button>{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">{error}</div>}{module && <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><article><div className="mb-6"><p className="eyebrow">{module.title}</p><h1 className="page-title mt-3">{lesson?.title || 'Урок'}</h1><ProgressBar className="mt-5" value={lesson ? 50 : 0} label="Модуль загружен из backend" /></div>{lesson && <Card className="p-6 sm:p-9"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-extrabold">Главная идея</h2><button onClick={speak} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-100 px-4 text-sm font-bold"><Volume2 className="h-4 w-4" /> Озвучить</button></div><p className="mt-5 text-lg leading-8 text-stone-700">{lesson.theory}</p><div className="my-7 rounded-3xl bg-ink p-7 text-center font-display text-2xl font-semibold text-white">{lesson.example}</div>{lesson.tasks?.[0] && <div className="mt-9 flex justify-end"><Button onClick={() => navigate(`/student/task/${lesson.tasks[0].id}`)}>Перейти к практике <ArrowRight className="h-5 w-5" /></Button></div>}</Card>}</article><aside><Card className="p-5"><p className="eyebrow">В модуле</p>{module.lessons?.map((item) => <button key={item.id} onClick={() => chooseLesson(item.id)} className={`mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-bold ${lesson?.id === item.id ? 'bg-lavender-100 text-lavender-700' : 'hover:bg-stone-100'}`}><BookOpenText className="h-4 w-4" />{item.title}</button>)}</Card></aside></div>}</div>;
}
