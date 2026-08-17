import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import { diagnosticQuestions } from '../../shared/data/mockData';

export function DiagnosticPage() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const question = diagnosticQuestions[index];
  const selected = answers[question?.id];
  const choose = (answerIndex) => setAnswers({ ...answers, [question.id]: answerIndex });
  const next = () => index === diagnosticQuestions.length - 1 ? setDone(true) : setIndex(index + 1);
  if (done) {
    return <div className="mx-auto max-w-3xl py-8"><Card className="overflow-hidden"><div className="bg-lavender-100 p-8 text-center sm:p-12"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-lavender-600 text-white"><Sparkles className="h-8 w-8" /></span><p className="eyebrow mt-7">Диагностика завершена</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Твоя точка роста найдена</h1><p className="mx-auto mt-4 max-w-xl text-stone-600">Чтобы уверенно решать квадратные уравнения, сначала закрепим разложение на множители.</p></div><div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">{[['76%', 'Базовые навыки'], ['1', 'Ключевой пробел'], ['18 мин', 'Первый шаг']].map(([value, label]) => <div key={label} className="rounded-2xl bg-stone-100 p-5 text-center"><p className="font-display text-2xl font-semibold text-lavender-700">{value}</p><p className="mt-1 text-sm text-stone-600">{label}</p></div>)}</div><div className="border-t border-stone-200 p-6 sm:flex sm:items-center sm:justify-between sm:gap-4"><p className="text-sm text-stone-500">Теперь SANA соберёт план под твой результат.</p><Button className="mt-4 w-full sm:mt-0 sm:w-auto" onClick={() => navigate('/student/generating-plan')}>Создать мой план <ArrowRight className="h-5 w-5" /></Button></div></Card></div>;
  }
  return <div className="mx-auto max-w-4xl py-2 sm:py-8">
    <div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow">Адаптивная диагностика</p><h1 className="mt-2 text-3xl font-extrabold">Математика · 9 класс</h1></div><span className="inline-flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm font-bold text-stone-600"><Clock3 className="h-4 w-4" /> ~4 мин</span></div>
    <ProgressBar value={((index + 1) / diagnosticQuestions.length) * 100} label={`Вопрос ${index + 1} из ${diagnosticQuestions.length}`} />
    <Card className="mt-7 p-6 sm:p-10"><p className="text-sm font-bold text-lavender-600">Проверяем навык: {question.skill}</p><h2 className="mt-4 text-2xl font-extrabold leading-snug sm:text-3xl">{question.question}</h2><fieldset className="mt-8"><legend className="sr-only">Выберите ответ</legend><div className="grid gap-3 sm:grid-cols-2">{question.answers.map((answer, answerIndex) => <label key={answer} className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 font-semibold transition ${selected === answerIndex ? 'border-lavender-500 bg-lavender-100 text-lavender-800' : 'border-stone-200 hover:border-lavender-300'}`}><input type="radio" name={`question-${question.id}`} className="sr-only" checked={selected === answerIndex} onChange={() => choose(answerIndex)} /><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${selected === answerIndex ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-500'}`}>{String.fromCharCode(65 + answerIndex)}</span>{answer}{selected === answerIndex && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0" />}</label>)}</div></fieldset><div className="mt-9 flex justify-end"><Button disabled={selected === undefined} onClick={next}>Ответить <ArrowRight className="h-5 w-5" /></Button></div></Card>
  </div>;
}
