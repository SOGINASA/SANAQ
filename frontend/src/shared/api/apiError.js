import { DEFAULT_LOCALE, translate } from '../i18n/i18n';

const currentLocale = () => {
  try {
    const persisted = JSON.parse(window.localStorage.getItem('sanaq-accessibility') || '{}');
    return persisted?.state?.locale || DEFAULT_LOCALE;
  } catch (_error) {
    return DEFAULT_LOCALE;
  }
};

export const localizedApiErrorMessage = (code, status = 0) => {
  const aliases = { CONTENT_VERSION_CONFLICT: 'draft.conflictTitle', VERSION_REQUIRED: 'draft.conflictTitle' };
  const key = aliases[code] || `apiErrors.${code}`;
  const localized = translate(currentLocale(), key, { status });
  return localized === key ? translate(currentLocale(), 'apiErrors.UNKNOWN', { status }) : localized;
};

export class ApiError extends Error {
  constructor({ code = 'NETWORK_ERROR', message, status = 0, details, requestId }) {
    super(typeof message === 'string' && message ? message : localizedApiErrorMessage(code, status));
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export const toApiError = (error) => {
  if (error instanceof ApiError) return error;
  const payload = error.response?.data?.error;
  return new ApiError({
    code: payload?.code || (error.response ? 'API_ERROR' : 'BACKEND_UNAVAILABLE'),
    message: localizedApiErrorMessage(
      payload?.message_code || payload?.code || (error.response ? 'API_ERROR' : 'BACKEND_UNAVAILABLE'),
      error.response?.status || 0,
    ),
    status: error.response?.status || 0,
    details: payload?.details,
    requestId: payload?.request_id,
  });
};
