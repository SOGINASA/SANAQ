import { useI18n } from '../../shared/i18n/i18n';

const baseClass = 'inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider';

export function DataSourceBadge({ meta, ai = false }) {
  const { t } = useI18n();
  if (ai) {
    const isServerTutor = meta?.generated_by_ai === false;
    return <span className={`${baseClass} ${isServerTutor ? 'bg-lavender-100 text-lavender-700' : 'bg-mint-100 text-mint-700'}`}>{t(isServerTutor ? 'dataSource.serverTutor' : 'dataSource.externalAi')}</span>;
  }
  if (!meta) return <span className={`${baseClass} bg-stone-200 text-stone-700`}>{t('dataSource.checking')}</span>;
  const mode = meta.dataMode || meta.data_mode || 'unknown';
  const isDemo = mode === 'demo_seed';
  return <span className={`${baseClass} ${isDemo ? 'bg-warning-100 text-warning-700' : 'bg-mint-100 text-mint-700'}`}>{t(isDemo ? 'dataSource.demo' : mode === 'live' ? 'dataSource.live' : 'dataSource.unknown')}</span>;
}
