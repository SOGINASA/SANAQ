import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAccessibilityStore = create(
  persist(
    (set) => ({
      locale: 'ru',
      largeText: false,
      reducedMotion: false,
      highContrast: false,
      setLocale: (locale) => set({ locale }),
      toggleLargeText: () => set((state) => ({ largeText: !state.largeText })),
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
    }),
    { name: 'sanaq-accessibility' }
  )
);
