export class ApiError extends Error {
  constructor({ code = 'NETWORK_ERROR', message, status = 0, details, requestId }) {
    super(message || 'Не удалось выполнить запрос');
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
    message:
      payload?.message ||
      (error.response
        ? `Backend вернул ошибку ${error.response.status}`
        : 'Backend недоступен. Проверьте соединение и повторите запрос.'),
    status: error.response?.status || 0,
    details: payload?.details,
    requestId: payload?.request_id,
  });
};
