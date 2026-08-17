import { Link } from 'react-router-dom';
import { Brand } from './Header';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-ink py-12 text-stone-300">
      <div className="page-container grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Brand light />
          <p className="mt-4 max-w-md text-sm leading-7 text-stone-400">Персональный маршрут знаний для каждого школьника Казахстана — независимо от школы и города.</p>
        </div>
        <div>
          <p className="font-bold text-white">Платформа</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link to="/about" className="hover:text-white">Как это работает</Link>
            <Link to="/accessibility" className="hover:text-white">Доступность</Link>
            <Link to="/teacher/dashboard" className="hover:text-white">Для учителей</Link>
          </div>
        </div>
        <div>
          <p className="font-bold text-white">Языки</p>
          <p className="mt-3 text-sm text-stone-400">Қазақша · Русский</p>
          <p className="mt-5 text-xs text-stone-500">Future Minds Hackathon 2026</p>
        </div>
      </div>
    </footer>
  );
}
