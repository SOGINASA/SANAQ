import { apiRequest } from '../../shared/api/apiClient';

export const classroomApi = {
  studentClasses: () => apiRequest({ method: 'GET', url: '/students/me/classes' }),
  feed: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}/feed` }),
  announce: (classId, payload) => apiRequest({ method: 'POST', url: `/classes/${classId}/announcements`, data: payload }),
  removeAnnouncement: (classId, announcementId) => apiRequest({ method: 'DELETE', url: `/classes/${classId}/announcements/${announcementId}` }),
  uploadWorkbook: async (file, uploadError = 'WORKBOOK_UPLOAD_FAILED') => {
    const ticket = await apiRequest({ method: 'POST', url: '/materials/upload-url', data: { filename: file.name, content_type: 'application/pdf' } });
    const response = await fetch(ticket.data.upload_url, { method: ticket.data.method || 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
    if (!response.ok) throw new Error(uploadError);
    return ticket.data.material_id;
  },
};
