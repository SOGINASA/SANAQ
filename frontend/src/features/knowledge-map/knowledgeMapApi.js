import { apiRequest } from '../../shared/api/apiClient';

export const knowledgeMapApi = {
  get: (subjectId = 'mathematics') =>
    apiRequest({ method: 'GET', url: '/students/me/knowledge-map', params: { subject_id: subjectId } }),
};
