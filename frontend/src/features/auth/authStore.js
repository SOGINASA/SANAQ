import { create } from 'zustand';
import { authApi } from './authApi';
import { tokenStorage } from '../../shared/storage/tokenStorage';

export const useAuthStore = create((set) => ({
  user: null,
  status: tokenStorage.getAccessToken() ? 'loading' : 'anonymous',
  error: null,
  hydrate: async () => {
    if (!tokenStorage.getAccessToken()) {
      set({ status: 'anonymous', user: null, error: null });
      return;
    }
    try {
      const result = await authApi.me();
      set({ user: result.data.user, status: 'authenticated', error: null });
    } catch (error) {
      tokenStorage.clear();
      set({ status: 'anonymous', user: null, error });
    }
  },
  login: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const result = await authApi.login(payload);
      set({ user: result.data.user, status: 'authenticated', error: null });
      return result;
    } catch (error) {
      set({ status: 'anonymous', error });
      throw error;
    }
  },
  loginWithPasskey: async () => {
    set({ status: 'loading', error: null });
    try {
      const result = await authApi.loginWithPasskey();
      set({ user: result.data.user, status: 'authenticated', error: null });
      return result;
    } catch (error) {
      set({ status: 'anonymous', error });
      throw error;
    }
  },
  register: async (payload) => {
    set({ status: 'loading', error: null });
    try {
      const result = await authApi.register(payload);
      set({ user: result.data.user, status: 'authenticated', error: null });
      return result;
    } catch (error) {
      set({ status: 'anonymous', error });
      throw error;
    }
  },
  completeGoogleLogin: async (code) => {
    set({ status: 'loading', error: null });
    try {
      const result = await authApi.exchangeGoogleCode(code);
      set({ user: result.data.user, status: 'authenticated', error: null });
      return result;
    } catch (error) {
      tokenStorage.clear();
      set({ user: null, status: 'anonymous', error });
      throw error;
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clear();
      set({ user: null, status: 'anonymous', error: null });
    }
  },
  expireSession: () => {
    tokenStorage.clear();
    set({ user: null, status: 'anonymous', error: null });
  },
  clearError: () => set({ error: null }),
}));
