import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Circle, LoaderCircle, Sparkles } from 'lucide-react';
import { Button, Card, ProgressBar } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';
import { learningPathApi } from '../../features/learning-path/learningPathApi';

const generationSteps = [
  ['Изучаем диагностику', 'Сверяем ответы и уверенность по каждому навыку.'],
  ['Находим пробелы', 'Отделяем случайные ошибки от тем, которые мешают двигаться дальше.'],
  ['Проверяем связи тем', 'Определяем, какие знания нужно закрепить раньше остальных.'],
  ['Рассчитываем нагрузку', 'Укладываем занятия в удобные 20 минут в день.'],
  ['Собираем маршрут', 'Добавляем уроки, практику и повторения в правильном порядке.'],
];

const progressByStep = [12, 34, 58, 81, 100];

export function PlanGenerationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRefresh = searchParams.get('mode') === 'refresh';
  const requestedPathId = searchParams.get('path');
  const [activeStep, setActiveStep] = useState(0);
  const [path, setPath] = useState(null);
  const [error, setError] = useState('');
  const complete = activeStep >= generationSteps.length;
  const progress = complete ? 100 : progressByStep[activeStep];

  const title = useMemo(() => isRefresh ? 'Обновляем твой план' : 'Создаём твой план', [isRefresh]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let pathId = requestedPathId;
        if (!pathId) {
          const list = await learningPathApi.list();
          pathId = list.data.items?.[0]?.id;
        }
        if (!pathId) throw new Error('Backend ещё не создал учебный маршрут');
        const response = isRefresh
          ? await learningPathApi.recalculate(pathId)
          : await learningPathApi.get(pathId);
        if (active) {
          setPath(response.data.learning_path);
          setActiveStep(generationSteps.length);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    load();
    return () => { active = false; };
  }, [isRefresh, requestedPathId]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-150px)] w-full max-w-5xl items-center py-3 sm:py-8">
      <Card className="w-full overflow-hidden">
        {error && <div className="border-b border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
        <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col items-center justify-center bg-lavender-50 p-6 text-center sm:p-10 lg:min-h-[620px]">
            <div className="relative">
              {!complete && <span className="absolute inset-2 rounded-full border-2 border-dashed border-lavender-300 animate-spin" aria-hidden="true" />}
              <img src={mascot} alt="SANA составляет персональный учебный план" className="mascot-image h-40 w-40 rounded-full object-cover sm:h-52 sm:w-52" width="208" height="208" />
              <span className={`absolute bottom-2 right-2 grid h-12 w-12 place-items-center rounded-2xl border-4 border-lavender-50 ${complete ? 'bg-mint-500 text-white' : 'bg-lavender-600 text-white'}`}>
                {complete ? <Check className="h-6 w-6" /> : <Sparkles className="h-5 w-5" />}
              </span>
            </div>
            <p className="eyebrow mt-7">SANA анализирует данные</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{complete ? 'План готов' : title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-stone-600">{complete ? 'Маршрут учитывает твои знания, цель и удобный темп занятий.' : 'Это займёт несколько секунд. Можно просто наблюдать — ничего нажимать не нужно.'}</p>
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-sm font-extrabold">{complete ? 'Готово' : `Шаг ${activeStep + 1} из ${generationSteps.length}`}</p><p className="mt-1 text-sm text-stone-500" aria-live="polite">{complete ? 'Все этапы завершены' : generationSteps[activeStep][0]}</p></div>
              <span className="font-display text-2xl font-semibold text-lavender-700 tabular-nums">{progress}%</span>
            </div>
            <ProgressBar className="mt-4" value={progress} />

            <ol className="mt-8 space-y-3" aria-label="Этапы создания плана">
              {generationSteps.map(([stepTitle, description], index) => {
                const done = index < activeStep || complete;
                const active = index === activeStep && !complete;
                return (
                  <li key={stepTitle} className={`flex gap-4 rounded-2xl border p-4 transition ${active ? 'border-lavender-300 bg-lavender-50' : 'border-transparent'} ${index > activeStep && !complete ? 'opacity-45' : ''}`} aria-current={active ? 'step' : undefined}>
                    <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${done ? 'bg-mint-100 text-mint-700' : active ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
                      {done ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <span><span className="block text-sm font-extrabold">{stepTitle}</span><span className="mt-1 hidden text-xs leading-5 text-stone-500 sm:block">{description}</span></span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8">
              {complete ? <Button size="lg" className="w-full" disabled={!path} onClick={() => navigate(`/student/path?path=${path.id}`, { replace: true })}>Открыть мой план <ArrowRight className="h-5 w-5" /></Button> : <p className="min-h-11 w-full rounded-xl text-center text-sm font-bold text-stone-500">Ожидаем расчёт маршрута на сервере</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
