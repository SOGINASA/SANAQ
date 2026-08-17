import { apiRequest } from '../../shared/api/apiClient';

export const adminContentApi = {
  list: () => apiRequest({ method: 'GET', url: '/modules' }),
  create: (payload) => apiRequest({ method: 'POST', url: '/modules', data: payload }),
  update: (moduleId, payload) => apiRequest({ method: 'PATCH', url: `/modules/${moduleId}`, data: payload }),
  remove: (moduleId) => apiRequest({ method: 'DELETE', url: `/modules/${moduleId}` }),
  publish: (moduleId) => apiRequest({ method: 'POST', url: `/modules/${moduleId}/publish` }),
};
