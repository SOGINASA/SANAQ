import { Eye, Keyboard, Languages, Volume2 } from 'lucide-react';
import { Card } from '../../shared/ui';

export function AccessibilityPage() {
  const items = [
    { icon: Keyboard, title: 'Клавиатурная навигация', text: 'Все основные сценарии доступны без мыши, фокус всегда видим.' },
    { icon: Eye, title: 'Контраст и масштаб', text: 'Текст соответствует WCAG AA, интерфейс не ломается при увеличении.' },
    { icon: Volume2, title: 'Подготовлено для озвучивания', text: 'Семантическая разметка и понятные подписи готовы для screen reader и TTS.' },
    { icon: Languages, title: 'Два языка', text: 'Русский и казахский интерфейс с простыми формулировками.' },
  ];
  return <section className="py-16 sm:py-24"><div className="page-container"><div className="max-w-3xl"><p className="eyebrow">Доступность</p><h1 className="page-title mt-4">Качественное образование не должно создавать новые барьеры</h1><p className="mt-6 text-lg text-stone-600">SANAQ проектируется mobile-first и учитывает разные способы восприятия и управления интерфейсом.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2">{items.map(({ icon: Icon, title, text }) => <Card key={title} className="p-7"><Icon className="h-7 w-7 text-lavender-600" /><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-2 text-stone-600">{text}</p></Card>)}</div></div></section>;
}
