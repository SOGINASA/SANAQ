import { Card } from '../../shared/ui';
import { ContentList } from '../../features/admin-content/ContentList';

export function ContentLibraryPage() {
  return <div className="mx-auto max-w-6xl animate-rise"><div><p className="eyebrow">Библиотека учителя</p><h1 className="page-title mt-3">Материалы</h1><p className="mt-3 text-stone-600">Создавайте собственные темы и используйте их в персональных маршрутах.</p></div><Card className="mt-8 p-6 sm:p-8"><ContentList /></Card></div>;
}
