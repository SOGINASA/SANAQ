import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAccessibilityStore = create(
  persist(
    (set) => ({
      locale: 'ru',
      largeText: false,
      reducedMotion: false,
      highContrast: false,
      speechRate: 1,
      setLocale: (locale) => set({ locale: ['ru', 'kk', 'en'].includes(locale) ? locale : 'ru' }),
      toggleLargeText: () => set((state) => ({ largeText: !state.largeText })),
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      setSpeechRate: (speechRate) => set({ speechRate: Math.max(0.7, Math.min(1.3, Number(speechRate) || 1)) }),
    }),
    { name: 'sanaq-accessibility' }
  )
);
