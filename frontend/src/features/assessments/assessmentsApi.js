import { apiRequest } from '../../shared/api/apiClient';

export const assessmentsApi = {
  task: (taskId) => apiRequest({ method: 'GET', url: `/tasks/${taskId}` }),
  startAttempt: (taskId) =>
    apiRequest({ method: 'POST', url: `/tasks/${taskId}/attempts` }),
  answer: (attemptId, answer) =>
    apiRequest({ method: 'POST', url: `/attempts/${attemptId}/answers`, data: { answer } }),
  complete: (attemptId) =>
    apiRequest({ method: 'POST', url: `/attempts/${attemptId}/complete` }),
  result: (attemptId) =>
    apiRequest({ method: 'GET', url: `/attempts/${attemptId}/result` }),
};
