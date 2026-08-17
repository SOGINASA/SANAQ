import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      login: ({ name = 'Айару', role = 'student' } = {}) =>
        set({ user: { id: 'demo-user', name, role } }),
      logout: () => set({ user: null }),
      switchRole: (role) => set({ user: { id: 'demo-user', name: role === 'teacher' ? 'Алия Сериковна' : 'Айару', role } }),
    }),
    { name: 'sanaq-auth' }
  )
);
