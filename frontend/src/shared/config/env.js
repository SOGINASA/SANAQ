const readBoolean = (value, fallback = false) => {
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
};

export const env = {
  apiUrl: process.env.REACT_APP_API_URL || '/api/v1',
  aiStreamUrl:
    process.env.REACT_APP_AI_STREAM_URL ||
    process.env.REACT_APP_API_URL ||
    '/api/v1',
  defaultLocale: process.env.REACT_APP_DEFAULT_LOCALE || 'ru',
  enableMocks: readBoolean(process.env.REACT_APP_ENABLE_MOCKS, false),
};
