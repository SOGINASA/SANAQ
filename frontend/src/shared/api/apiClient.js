import axios from 'axios';
import { env } from '../config/env';
import { tokenStorage } from '../storage/tokenStorage';
import { toApiError } from './apiError';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 12000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  try {
    const persisted = JSON.parse(window.localStorage.getItem('sanaq-accessibility') || '{}');
    config.headers['Accept-Language'] = persisted?.state?.locale || env.defaultLocale;
  } catch (_error) {
    config.headers['Accept-Language'] = env.defaultLocale;
  }
  return config;
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${env.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => {
        const token = response.data?.data?.access_token;
        if (!token) throw new Error('Refresh response has no access token');
        tokenStorage.setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRoute = /\/auth\/(login|register|refresh|logout)$/.test(original?.url || '');
    if (error.response?.status === 401 && original && !original.__retried && !isAuthRoute) {
      original.__retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (_refreshError) {
        tokenStorage.clear();
        window.dispatchEvent(new CustomEvent('sanaq:session-expired'));
      }
    }
    throw toApiError(error);
  },
);

export const unwrap = (response) => ({
  data: response.data?.data ?? {},
  meta: {
    ...(response.data?.meta || {}),
    source: 'backend',
    dataMode: response.headers?.['x-data-mode'] || 'unknown',
  },
});

export const apiRequest = async (config) => unwrap(await apiClient.request(config));
