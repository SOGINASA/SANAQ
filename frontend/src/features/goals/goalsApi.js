import { apiRequest } from '../../shared/api/apiClient';

export const goalsApi = {
  list: () => apiRequest({ method: 'GET', url: '/students/me/goals' }),
  create: (payload) => apiRequest({ method: 'POST', url: '/students/me/goals', data: payload }),
  update: (id, payload) => apiRequest({ method: 'PATCH', url: `/goals/${id}`, data: payload }),
  remove: (id) => apiRequest({ method: 'DELETE', url: `/goals/${id}` }),
};
