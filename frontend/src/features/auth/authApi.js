import { apiRequest } from '../../shared/api/apiClient';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { env } from '../../shared/config/env';
import { createPasskeyCredential, getPasskeyCredential } from './passkeyClient';

const saveAccessToken = (result) => {
  tokenStorage.setAccessToken(result.data.access_token);
  return result;
};

export const authApi = {
  register: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/register', data: payload })),
  login: async (payload) =>
    saveAccessToken(await apiRequest({ method: 'POST', url: '/auth/login', data: payload })),
  loginWithPasskey: async () => {
    const challenge = await apiRequest({ method: 'POST', url: '/auth/passkeys/authentication/options' });
    const credential = await getPasskeyCredential(challenge.data.options);
    return saveAccessToken(await apiRequest({
      method: 'POST',
      url: '/auth/passkeys/authentication/verify',
      data: { credential },
    }));
  },
  passkeys: () => apiRequest({ method: 'GET', url: '/auth/passkeys' }),
  addPasskey: async (name) => {
    const challenge = await apiRequest({ method: 'POST', url: '/auth/passkeys/registration/options' });
    const credential = await createPasskeyCredential(challenge.data.options);
    return apiRequest({
      method: 'POST',
      url: '/auth/passkeys/registration/verify',
      data: { credential, name },
    });
  },
  removePasskey: (credentialId) => apiRequest({
    method: 'DELETE',
    url: `/auth/passkeys/${encodeURIComponent(credentialId)}`,
  }),
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
