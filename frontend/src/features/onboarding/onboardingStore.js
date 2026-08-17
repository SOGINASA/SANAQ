import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
  persist(
    (set) => ({
      profile: { grade: '9', subject: 'math', goal: 'exam', pace: 'balanced' },
      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
    }),
    { name: 'sanaq-profile' }
  )
);
