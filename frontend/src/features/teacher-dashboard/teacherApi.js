import { apiRequest } from '../../shared/api/apiClient';

export const teacherApi = {
  dashboard: () => apiRequest({ method: 'GET', url: '/teachers/me/dashboard' }),
  classes: () => apiRequest({ method: 'GET', url: '/teachers/me/classes' }),
  createClass: (payload) => apiRequest({ method: 'POST', url: '/classes', data: payload }),
  classDetails: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}` }),
  students: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}/students` }),
  analytics: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}/analytics` }),
  weakSkills: (classId) => apiRequest({ method: 'GET', url: `/classes/${classId}/weak-skills` }),
  studentProgress: (studentId) => apiRequest({ method: 'GET', url: `/teachers/students/${studentId}/progress` }),
  comment: (studentId, payload) => apiRequest({ method: 'POST', url: `/teachers/students/${studentId}/comments`, data: payload }),
  assignments: () => apiRequest({ method: 'GET', url: '/assignments' }),
  createAssignment: (payload) => apiRequest({ method: 'POST', url: '/assignments', data: payload }),
  updateAssignment: (assignmentId, payload) => apiRequest({ method: 'PATCH', url: `/assignments/${assignmentId}`, data: payload }),
  publishAssignment: (assignmentId) => apiRequest({ method: 'POST', url: `/assignments/${assignmentId}/publish` }),
  studentAssignments: () => apiRequest({ method: 'GET', url: '/students/me/assignments' }),
};
