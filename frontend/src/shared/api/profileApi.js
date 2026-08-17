import { apiRequest } from './apiClient';

export const profileApi = {
  update: (payload) => apiRequest({ method: 'PATCH', url: '/users/me', data: payload }),
  preferences: () => apiRequest({ method: 'GET', url: '/users/me/preferences' }),
  savePreferences: (payload) => apiRequest({ method: 'PATCH', url: '/users/me/preferences', data: payload }),
  joinClass: (joinCode) => apiRequest({ method: 'POST', url: '/classes/join', data: { join_code: joinCode } }),
};
