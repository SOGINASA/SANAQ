import { apiRequest } from '../../shared/api/apiClient';

export const progressApi = {
  summary: (subjectId = 'mathematics') =>
    apiRequest({ method: 'GET', url: '/students/me/progress/summary', params: { subject_id: subjectId } }),
  topics: (subjectId = 'mathematics') =>
    apiRequest({ method: 'GET', url: '/students/me/progress/topics', params: { subject_id: subjectId } }),
  weakSkills: (subjectId = 'mathematics') =>
    apiRequest({ method: 'GET', url: '/students/me/weak-skills', params: { subject_id: subjectId } }),
};
