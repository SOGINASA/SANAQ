import { apiRequest } from '../../shared/api/apiClient';

export const classroomApi = {
  studentClasses: () => apiRequest({ method: 'GET', url: '/students/me/classes' }),
  feed: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}/feed` }),
  announce: (classId, payload) => apiRequest({ method: 'POST', url: `/classes/${classId}/announcements`, data: payload }),
  removeAnnouncement: (classId, announcementId) => apiRequest({ method: 'DELETE', url: `/classes/${classId}/announcements/${announcementId}` }),
};
