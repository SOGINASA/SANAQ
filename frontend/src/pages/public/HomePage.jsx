import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Check, Languages, Map, MessageCircleQuestion, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button, Card } from '../../shared/ui';
import mascot from '../../assets/images/sana-mascot.png';

const features = [
  { icon: BrainCircuit, title: 'Диагностика без стресса', text: '4–7 коротких вопросов находят не оценку, а конкретный пробел.', tone: 'bg-lavender-100 text-lavender-700' },
  { icon: Map, title: 'Живое созвездие знаний', text: 'Видно, какая тема блокирует следующую и почему маршрут изменился.', tone: 'bg-mint-100 text-mint-700' },
  { icon: MessageCircleQuestion, title: 'Объяснение, которое подходит тебе', text: 'SANA объяснит коротко, пошагово или на жизненном примере.', tone: 'bg-[#FFE8E2] text-[#9B3D2D]' },
  { icon: Users, title: 'Учитель видит главное', text: 'Не десятки таблиц, а навыки, где классу действительно нужна помощь.', tone: 'bg-lime/30 text-[#52670A]' },
];

export function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <section className="hero-grid overflow-hidden border-b border-stone-200 py-14 sm:py-20 lg:py-24">
        <div className="page-container grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="animate-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lavender-200 bg-lavender-50 px-4 py-2 text-sm font-bold text-lavender-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> AI-навигация по знаниям
            </div>
            <h1 className="max-w-3xl font-display text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-[4.6rem]">
              Учись не больше. <span className="text-lavender-600">Учись точнее.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">SANAQ находит пробелы, строит личный маршрут и объясняет сложное так, как понятно именно тебе — на русском и казахском.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/student/onboarding')}>Пройти диагностику <ArrowRight className="h-5 w-5" /></Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/student/dashboard')}>Посмотреть демо</Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-stone-600">
              {['7–12 классы', '2 языка', 'Без платной подписки в MVP'].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-mint-700" />{item}</span>)}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-3 top-12 z-10 rounded-2xl border border-stone-200 bg-paper p-4 shadow-soft sm:-left-10">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Найден пробел</p>
              <p className="mt-1 font-bold">Разложение на множители</p>
            </div>
            <div className="absolute -right-2 bottom-16 z-10 rounded-2xl bg-ink p-4 text-white shadow-soft sm:-right-8">
              <p className="text-xs font-bold uppercase tracking-wider text-lime">Следующий шаг</p>
              <p className="mt-1 font-bold">8 минут · 3 задания</p>
            </div>
            <div className="rounded-[3rem] border border-lavender-200 bg-[#F7F6F2] p-2 shadow-soft">
              <img src={mascot} alt="SANA — AI-спутник, который помогает разбираться в сложных темах" className="mascot-image aspect-[4/4.5] w-full rounded-[2.6rem] object-cover" width="700" height="780" fetchPriority="high" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 sm:py-28">
        <div className="page-container">
          <div className="max-w-2xl"><p className="eyebrow">Не сборник уроков</p><h2 className="page-title mt-4">Маршрут меняется вместе с тобой</h2><p className="mt-5 text-lg text-stone-600">Каждая рекомендация объяснима: ты видишь не только что учить, но и зачем это нужно именно сейчас.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text, tone }, index) => (
              <Card key={title} className={`p-6 ${index === 1 ? 'md:translate-y-6' : ''}`}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-6 text-xl font-extrabold leading-snug">{title}</h3><p className="mt-3 text-sm leading-7 text-stone-600">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="pb-20 sm:pb-28">
        <div className="page-container">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl"><p className="eyebrow">Продукт в действии</p><h2 className="page-title mt-4">Всё важное — на одном экране</h2></div>
            <p className="max-w-xl text-stone-600">Ученик не выбирает из сотен курсов. SANAQ показывает один следующий шаг, объясняет его смысл и перестраивает маршрут после каждого результата.</p>
          </div>
          <div className="overflow-hidden rounded-[2.5rem] border border-stone-200 bg-ink p-3 shadow-soft sm:p-5">
            <div className="overflow-hidden rounded-[2rem] bg-canvas">
              <div className="flex items-center gap-2 border-b border-stone-200 bg-paper px-5 py-4"><span className="h-3 w-3 rounded-full bg-[#F17862]" /><span className="h-3 w-3 rounded-full bg-[#F0C75E]" /><span className="h-3 w-3 rounded-full bg-mint-500" /><span className="ml-3 text-xs font-bold text-stone-400">Личный кабинет · Айару</span></div>
              <div className="grid lg:grid-cols-[210px_1fr]">
                <div className="hidden border-r border-stone-200 bg-paper p-5 lg:block">
                  <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lavender-600 text-white"><Sparkles className="h-4 w-4" /></span><span className="font-display font-semibold">SANAQ</span></div>
                  <div className="mt-8 space-y-2">{['Обзор', 'Мой маршрут', 'Карта знаний', 'Ассистент SANA'].map((item, index) => <div key={item} className={`rounded-xl px-3 py-3 text-sm font-bold ${index === 0 ? 'bg-lavender-100 text-lavender-700' : 'text-stone-500'}`}>{item}</div>)}</div>
                </div>
                <div className="p-5 sm:p-8">
                  <p className="text-sm font-bold text-lavender-700">Сәлем, Айару!</p><h3 className="mt-1 text-2xl font-extrabold">Твой следующий шаг</h3>
                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                    <div className="rounded-3xl bg-ink p-6 text-white sm:p-8"><span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">ШАГ ДНЯ</span><h4 className="mt-6 text-2xl font-extrabold">Разложение на множители</h4><p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">Навык откроет квадратные уравнения. 18 минут · 4 задания.</p><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-lime" /></div></div>
                    <div className="rounded-3xl border border-stone-200 bg-paper p-6"><MessageCircleQuestion className="h-7 w-7 text-lavender-600" /><p className="mt-5 font-extrabold">Не понял шаг?</p><p className="mt-2 text-sm leading-6 text-stone-500">SANA объяснит короче, по шагам или на примере.</p><Link to="/student/assistant" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-lavender-700">Открыть чат <ArrowRight className="h-4 w-4" /></Link></div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">{[['12 дней', 'серия'], ['7 навыков', 'освоено'], ['73%', 'путь к цели']].map(([value, label]) => <div key={label} className="rounded-2xl border border-stone-200 bg-paper p-4"><p className="text-xl font-extrabold">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-white sm:py-28">
        <div className="page-container grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div><p className="eyebrow text-lime">Один понятный цикл</p><h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">От пробела до уверенности — шаг за шагом</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['01', 'Укажи цель', 'Класс, предмет, экзамен или олимпиада.'],
              ['02', 'Пройди диагностику', 'SANAQ находит сильные стороны и пробелы.'],
              ['03', 'Закрой один пробел', 'Короткая теория, практика и понятная обратная связь.'],
              ['04', 'Увидь результат', 'Карта обновляется, а маршрут открывает следующий узел.'],
            ].map(([number, title, text]) => (
              <div key={number} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6"><span className="font-display text-sm text-lime">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-400">{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="page-container">
          <div className="grid overflow-hidden rounded-[2.5rem] bg-lavender-100 lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-16"><p className="eyebrow">Доступно каждому</p><h2 className="page-title mt-4">Один продукт для ученика и учителя</h2><p className="mt-5 max-w-xl text-stone-600">Ученик получает поддержку без стыда за ошибку. Учитель — ясный сигнал, кому и с какой темой помочь.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-paper p-5"><Languages className="h-6 w-6 text-lavender-600" /><p className="mt-3 font-bold">Русский + қазақша</p></div>
                <div className="rounded-2xl bg-paper p-5"><ShieldCheck className="h-6 w-6 text-mint-700" /><p className="mt-3 font-bold">Безопасный AI-контекст</p></div>
              </div>
            </div>
            <div className="grid place-items-center bg-lavender-600 p-10 text-center text-white"><div><p className="font-display text-6xl font-semibold tracking-[-0.06em] sm:text-8xl">+27%</p><p className="mt-3 max-w-sm text-lavender-100">демонстрационный прирост освоения навыка после персонального маршрута</p><p className="mt-4 text-xs text-lavender-200">Mock-метрика для MVP, не результат исследования</p></div></div>
          </div>
        </div>
      </section>

      <section id="ai" className="pb-20 sm:pb-28">
        <div className="page-container grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.5rem] bg-ink p-8 text-white sm:p-12">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-ink"><BrainCircuit className="h-7 w-7" /></span>
            <p className="eyebrow mt-8 text-lime">AI с понятной ролью</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Не решает за ученика. Помогает научиться решать.</h2>
            <p className="mt-5 leading-7 text-stone-400">Ассистент работает в контексте школьной программы и текущего урока, просит сделать собственную попытку и только затем даёт следующий уровень подсказки.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['01', 'Видит контекст', 'Знает тему, класс, прошлые ошибки и цель ученика.'],
              ['02', 'Меняет объяснение', 'Коротко, пошагово, через аналогию или новый пример.'],
              ['03', 'Не маскирует пробел', 'Не подменяет обучение готовым ответом на домашнее задание.'],
              ['04', 'Показывает причину', 'Объясняет, почему рекомендована именно эта тема и этот шаг.'],
            ].map(([number, title, text]) => <Card key={number} className="p-6 sm:p-7"><span className="font-display text-sm font-semibold text-lavender-600">{number}</span><h3 className="mt-8 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-7 text-stone-600">{text}</p></Card>)}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="page-container">
          <div className="rounded-[2.5rem] border border-stone-200 bg-paper p-8 sm:p-12">
            <div className="max-w-2xl"><p className="eyebrow">Почему SANAQ запомнят</p><h2 className="page-title mt-4">SANA — не декорация, а навигатор</h2><p className="mt-5 text-lg leading-8 text-stone-600">Характер платформы строится не на очках и бесконечных уведомлениях, а на ощущении прогресса: спутник замечает затруднение, объясняет решение и празднует освоенный навык.</p></div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ['Замечает', '«Похоже, трудность не в новой теме, а в дробях. Давай быстро проверим».'],
                ['Поддерживает', '«Ошибка показывает конкретное место. Разберём только его — остальное у тебя получается».'],
                ['Отпускает', '«Ты уже справляешься без подсказки. Этот узел карты теперь твой».'],
              ].map(([title, quote]) => <div key={title} className="rounded-3xl bg-canvas p-6"><p className="font-extrabold text-lavender-700">{title}</p><p className="mt-4 text-sm leading-7 text-stone-600">{quote}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="page-container">
          <div className="rounded-[2.5rem] bg-lime p-8 text-ink sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div><p className="eyebrow text-ink">Первый шаг занимает 4 минуты</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Узнай, что мешает двигаться дальше</h2></div>
            <Link to="/student/onboarding" className="mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-ink px-7 font-bold text-white transition hover:bg-stone-800 lg:mt-0">Начать диагностику <ArrowRight className="h-5 w-5" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
