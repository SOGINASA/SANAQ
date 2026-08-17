import { apiRequest } from '../../shared/api/apiClient';

export const reviewsApi = {
  due: () => apiRequest({ method: 'GET', url: '/reviews/due' }),
  calendar: () => apiRequest({ method: 'GET', url: '/students/me/review-calendar' }),
  start: (id) => apiRequest({ method: 'POST', url: `/reviews/${id}/start` }),
  complete: (id) => apiRequest({ method: 'POST', url: `/reviews/${id}/complete` }),
};
