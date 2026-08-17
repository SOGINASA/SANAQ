const baseClass = 'inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider';

export function DataSourceBadge({ meta, ai = false }) {
  if (ai) {
    const isFallback = meta?.generated_by_ai === false;
    return (
      <span className={`${baseClass} ${isFallback ? 'bg-amber-100 text-amber-900' : 'bg-mint-100 text-mint-700'}`}>
        {isFallback ? 'Проверенный fallback · не внешний AI' : 'Ответ внешней AI-модели'}
      </span>
    );
  }

  if (!meta) {
    return <span className={`${baseClass} bg-stone-200 text-stone-700`}>Источник данных проверяется</span>;
  }
  const mode = meta.dataMode || meta.data_mode || 'unknown';
  const isDemo = mode === 'demo_seed';
  return (
    <span className={`${baseClass} ${isDemo ? 'bg-amber-100 text-amber-900' : 'bg-mint-100 text-mint-700'}`}>
      {isDemo ? 'Backend API · демо seed' : mode === 'live' ? 'Backend API · реальные данные' : 'Backend API · режим данных не указан'}
    </span>
  );
}
