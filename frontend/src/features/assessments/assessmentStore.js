import { create } from 'zustand';

export const useAssessmentStore = create((set) => ({
  currentQuestion: 0,
  answers: {},
  completed: false,
  answer: (questionId, value) => set((state) => ({ answers: { ...state.answers, [questionId]: value } })),
  next: () => set((state) => ({ currentQuestion: state.currentQuestion + 1 })),
  complete: () => set({ completed: true }),
  reset: () => set({ currentQuestion: 0, answers: {}, completed: false }),
}));
