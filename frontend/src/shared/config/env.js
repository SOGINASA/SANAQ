const readBoolean = (value, fallback = false) => {
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
};

const defaultApiUrl = process.env.NODE_ENV === 'development'
  ? 'http://127.0.0.1:8000/api/v1'
  : '/api/v1';

export const env = {
  apiUrl: process.env.REACT_APP_API_URL || defaultApiUrl,
  aiStreamUrl:
    process.env.REACT_APP_AI_STREAM_URL ||
    process.env.REACT_APP_API_URL ||
    defaultApiUrl,
  defaultLocale: process.env.REACT_APP_DEFAULT_LOCALE || 'ru',
  enableMocks: readBoolean(process.env.REACT_APP_ENABLE_MOCKS, false),
};
