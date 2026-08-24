import { apiRequest } from '../../shared/api/apiClient';

export const learningPathApi = {
  list: () => apiRequest({ method: 'GET', url: '/students/me/learning-paths' }),
  create: (payload) =>
    apiRequest({ method: 'POST', url: '/students/me/learning-paths', data: payload }),
  previewStudyPlan: (payload) =>
    apiRequest({ method: 'POST', url: '/students/me/study-plan/preview', data: payload }),
  get: (pathId) => apiRequest({ method: 'GET', url: `/learning-paths/${pathId}` }),
  nextStep: (pathId) =>
    apiRequest({ method: 'GET', url: `/learning-paths/${pathId}/next-step` }),
  history: (pathId) => apiRequest({ method: 'GET', url: `/learning-paths/${pathId}/history` }),
  update: (pathId, payload) =>
    apiRequest({ method: 'PATCH', url: `/learning-paths/${pathId}`, data: payload }),
  recalculate: (pathId) =>
    apiRequest({ method: 'POST', url: `/learning-paths/${pathId}/recalculate` }),
};
