import { apiRequest } from './apiClient';

export const catalogApi = {
  meta: () => apiRequest({ method: 'GET', url: '/meta' }),
  grades: () => apiRequest({ method: 'GET', url: '/catalog/grades' }),
  subjects: () => apiRequest({ method: 'GET', url: '/catalog/subjects' }),
  goals: () => apiRequest({ method: 'GET', url: '/catalog/goals' }),
  topics: (subjectId) =>
    apiRequest({ method: 'GET', url: `/catalog/subjects/${subjectId}/topics` }),
  studentProfile: () => apiRequest({ method: 'GET', url: '/students/me/profile' }),
  saveStudentProfile: (payload) =>
    apiRequest({ method: 'PUT', url: '/students/me/profile', data: payload }),
};

