import { apiRequest } from '../../shared/api/apiClient';

export const gamificationApi = {
  achievements: () => apiRequest({ method: 'GET', url: '/students/me/achievements' }),
  streak: () => apiRequest({ method: 'GET', url: '/students/me/streak' }),
};
