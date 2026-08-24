import { apiClient, apiRequest } from './apiClient';

export const contentApi = {
  modules: (params = {}) => apiRequest({ method: 'GET', url: '/modules', params }),
  module: (moduleId) => apiRequest({ method: 'GET', url: `/modules/${moduleId}` }),
  lesson: (lessonId) => apiRequest({ method: 'GET', url: `/lessons/${lessonId}` }),
  lessonFeedback: (lessonId, payload) => apiRequest({ method: 'POST', url: `/lessons/${lessonId}/feedback`, data: payload }),
  lessonWorkbook: (lessonId) => apiClient.get(`/lessons/${lessonId}/workbook.pdf`, { responseType: 'blob', timeout: 30000 }),
  moduleWorkbook: (moduleId) => apiClient.get(`/modules/${moduleId}/workbook.pdf`, { responseType: 'blob', timeout: 30000 }),
  material: (materialId) => apiClient.get(`/materials/${materialId}/content`, { responseType: 'blob', timeout: 30000 }),
  task: (taskId) => apiRequest({ method: 'GET', url: `/tasks/${taskId}` }),
};
