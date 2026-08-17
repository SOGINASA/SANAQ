import { apiRequest } from './apiClient';

export const contentApi = {
  modules: (params = {}) => apiRequest({ method: 'GET', url: '/modules', params }),
  module: (moduleId) => apiRequest({ method: 'GET', url: `/modules/${moduleId}` }),
  lesson: (lessonId) => apiRequest({ method: 'GET', url: `/lessons/${lessonId}` }),
  task: (taskId) => apiRequest({ method: 'GET', url: `/tasks/${taskId}` }),
};
