import { apiRequest } from '../../shared/api/apiClient';

export const diagnosticsApi = {
  create: (payload) => apiRequest({ method: 'POST', url: '/diagnostics', data: payload }),
  get: (id) => apiRequest({ method: 'GET', url: `/diagnostics/${id}` }),
  nextQuestion: (id) =>
    apiRequest({ method: 'GET', url: `/diagnostics/${id}/next-question` }),
  answer: (id, payload) =>
    apiRequest({ method: 'POST', url: `/diagnostics/${id}/answers`, data: payload }),
  complete: (id) =>
    apiRequest({ method: 'POST', url: `/diagnostics/${id}/complete` }),
  result: (id) => apiRequest({ method: 'GET', url: `/diagnostics/${id}/result` }),
  history: () => apiRequest({ method: 'GET', url: '/students/me/diagnostics' }),
};
