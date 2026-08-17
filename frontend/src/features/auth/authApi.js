import { apiRequest } from '../../shared/api/apiClient';
import { tokenStorage } from '../../shared/storage/tokenStorage';

const saveAccessToken = (result) => {
  tokenStorage.setAccessToken(result.data.access_token);
  return result;
};

export const authApi = {
  register: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/register', data: payload })),
  login: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/login', data: payload })),
  me: () => apiRequest({ method: 'GET', url: '/auth/me' }),
  logout: async () => {
    try {
      return await apiRequest({ method: 'POST', url: '/auth/logout' });
    } finally {
      tokenStorage.clear();
    }
  },
};
