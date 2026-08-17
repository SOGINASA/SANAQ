import { apiRequest } from '../../shared/api/apiClient';

export const learningPathApi = {
  list: () => apiRequest({ method: 'GET', url: '/students/me/learning-paths' }),
  get: (pathId) => apiRequest({ method: 'GET', url: `/learning-paths/${pathId}` }),
  nextStep: (pathId) =>
    apiRequest({ method: 'GET', url: `/learning-paths/${pathId}/next-step` }),
  recalculate: (pathId) =>
    apiRequest({ method: 'POST', url: `/learning-paths/${pathId}/recalculate` }),
};
