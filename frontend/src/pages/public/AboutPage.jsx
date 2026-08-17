import { ArrowRight, BrainCircuit, Eye, RefreshCw, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../shared/ui';

export function AboutPage() {
  const navigate = useNavigate();
  const items = [
    { icon: BrainCircuit, title: 'Понимает исходную точку', text: 'Диагностика проверяет связанные навыки и не тратит время на то, что уже освоено.' },
    { icon: Route, title: 'Строит короткий маршрут', text: 'Алгоритм выбирает ближайший полезный шаг с учётом цели и доступного времени.' },
    { icon: Eye, title: 'Объясняет решение', text: 'Рекомендация всегда содержит понятное «почему», источники навыков и уверенность.' },
    { icon: RefreshCw, title: 'Перестраивается после ответа', text: 'Сложность и следующая тема обновляются по результатам, а не по жёсткому плану.' },
  ];
  return (
    <section className="py-16 sm:py-24"><div className="page-container">
      <div className="max-w-3xl"><p className="eyebrow">Как работает SANAQ</p><h1 className="page-title mt-4">Персонализация, которую можно увидеть и объяснить</h1><p className="mt-6 text-lg leading-8 text-stone-600">Мы не подменяем учителя и не выдаём готовые ответы. SANAQ помогает понять, какой базовый навык мешает ученику двигаться дальше.</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">{items.map(({ icon: Icon, title, text }, index) => <Card key={title} className="p-7 sm:p-9"><span className="font-display text-sm text-lavender-500">0{index + 1}</span><Icon className="mt-8 h-8 w-8 text-lavender-600" /><h2 className="mt-4 text-2xl font-extrabold">{title}</h2><p className="mt-3 max-w-xl text-stone-600">{text}</p></Card>)}</div>
      <div className="mt-12 rounded-4xl bg-ink p-8 text-white sm:p-12"><h2 className="font-display text-3xl font-semibold">Посмотри путь ученика вживую</h2><p className="mt-3 max-w-xl text-stone-400">Демо полностью интерактивно и работает на mock-данных — безопасно для презентации.</p><Button className="mt-7" onClick={() => navigate('/student/onboarding')}>Начать путь <ArrowRight className="h-5 w-5" /></Button></div>
    </div></section>
  );
}
