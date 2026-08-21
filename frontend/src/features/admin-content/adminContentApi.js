import { apiRequest } from '../../shared/api/apiClient';

export const adminContentApi = {
  list: () => apiRequest({ method: 'GET', url: '/modules' }),
  get: (moduleId) => apiRequest({ method: 'GET', url: `/modules/${moduleId}` }),
  create: (payload) => apiRequest({ method: 'POST', url: '/modules', data: payload }),
  update: (moduleId, payload) => apiRequest({ method: 'PATCH', url: `/modules/${moduleId}`, data: payload }),
  saveEditor: (moduleId, payload) => apiRequest({ method: 'PUT', url: `/modules/${moduleId}/editor`, data: payload }),
  remove: (moduleId) => apiRequest({ method: 'DELETE', url: `/modules/${moduleId}` }),
  publish: (moduleId) => apiRequest({ method: 'POST', url: `/modules/${moduleId}/publish` }),
  createLesson: (payload) => apiRequest({ method: 'POST', url: '/lessons', data: payload }),
  updateLesson: (lessonId, payload) => apiRequest({ method: 'PATCH', url: `/lessons/${lessonId}`, data: payload }),
  removeLesson: (lessonId) => apiRequest({ method: 'DELETE', url: `/lessons/${lessonId}` }),
  createTask: (payload) => apiRequest({ method: 'POST', url: '/tasks', data: payload }),
  updateTask: (taskId, payload) => apiRequest({ method: 'PATCH', url: `/tasks/${taskId}`, data: payload }),
  removeTask: (taskId) => apiRequest({ method: 'DELETE', url: `/tasks/${taskId}` }),
};
