import { Card } from '../../shared/ui';
import { ContentList } from '../../features/admin-content/ContentList';
import { useI18n } from '../../shared/i18n/i18n';

export function ContentLibraryPage() {
  const { t } = useI18n();
  return <div className="mx-auto max-w-6xl animate-rise"><div><p className="eyebrow">{t('contentLibrary.eyebrow')}</p><h1 className="page-title mt-3">{t('contentLibrary.title')}</h1><p className="mt-3 text-stone-600">{t('contentLibrary.description')}</p></div><Card className="mt-8 p-5 sm:p-8"><ContentList /></Card></div>;
}
