import { apiRequest } from '../../shared/api/apiClient';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { env } from '../../shared/config/env';

const saveAccessToken = (result) => {
  tokenStorage.setAccessToken(result.data.access_token);
  return result;
};

export const authApi = {
  register: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/register', data: payload })),
  login: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/login', data: payload })),
  googleLoginUrl: ({ role = 'student', locale = 'ru' } = {}) => {
    const url = new URL(`${env.apiUrl.replace(/\/$/, '')}/auth/google`, window.location.origin);
    url.searchParams.set('role', role);
    url.searchParams.set('locale', locale);
    return url.toString();
  },
  exchangeGoogleCode: async (code) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/google/exchange', data: { code } })),
  forgotPassword: (email) =>
    apiRequest({ method: 'POST', url: '/auth/forgot-password', data: { email } }),
  me: () => apiRequest({ method: 'GET', url: '/auth/me' }),
  logout: async () => {
    try {
      return await apiRequest({ method: 'POST', url: '/auth/logout' });
    } finally {
      tokenStorage.clear();
    }
  },
};
