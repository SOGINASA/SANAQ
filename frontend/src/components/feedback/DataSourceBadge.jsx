export function DataSourceBadge({ meta, ai = false }) {
  if (ai) {
    const isFallback = meta?.generated_by_ai === false;
    return (
      <span className={`source-badge ${isFallback ? 'source-fallback' : 'source-live'}`}>
        {isFallback ? 'Проверенный fallback · не внешний AI' : 'Ответ внешней AI-модели'}
      </span>
    );
  }

  if (!meta) {
    return <span className="source-badge source-pending">Источник данных проверяется</span>;
  }
  const mode = meta?.dataMode || meta?.data_mode || 'unknown';
  return (
    <span className={`source-badge ${mode === 'demo_seed' ? 'source-demo' : 'source-live'}`}>
      {mode === 'demo_seed'
        ? 'Backend API · демо seed'
        : mode === 'live'
          ? 'Backend API · реальные данные'
          : 'Backend API · режим данных не указан'}
    </span>
  );
}
