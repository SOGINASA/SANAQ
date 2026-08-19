import { apiRequest } from '../../shared/api/apiClient';

export const adminApi = {
  dashboard: () => apiRequest({ method: 'GET', url: '/admin/dashboard' }),
  users: ({ search = '', role = '', page = 1 } = {}) => apiRequest({ method: 'GET', url: '/admin/users', params: { search, role, page, page_size: 50 } }),
  createUser: (payload) => apiRequest({ method: 'POST', url: '/admin/users', data: payload }),
  updateUser: (userId, payload) => apiRequest({ method: 'PATCH', url: `/admin/users/${userId}`, data: payload }),
  updateUserStatus: (userId, payload) => apiRequest({ method: 'PATCH', url: `/admin/users/${userId}/status`, data: payload }),
  resetPassword: (userId, password) => apiRequest({ method: 'POST', url: `/admin/users/${userId}/reset-password`, data: { password } }),
  classes: () => apiRequest({ method: 'GET', url: '/admin/classes' }),
  updateClass: (classId, payload) => apiRequest({ method: 'PATCH', url: `/admin/classes/${classId}`, data: payload }),
  removeClass: (classId) => apiRequest({ method: 'DELETE', url: `/admin/classes/${classId}` }),
  reviewQueue: () => apiRequest({ method: 'GET', url: '/admin/content/review' }),
  approveContent: (contentId, payload = {}) => apiRequest({ method: 'POST', url: `/admin/content/${contentId}/approve`, data: payload }),
  rejectContent: (contentId, payload = {}) => apiRequest({ method: 'POST', url: `/admin/content/${contentId}/reject`, data: payload }),
  aiReports: () => apiRequest({ method: 'GET', url: '/admin/ai/reports' }),
  updateAiReport: (reportId, payload) => apiRequest({ method: 'PATCH', url: `/admin/ai/reports/${reportId}`, data: payload }),
  auditLog: () => apiRequest({ method: 'GET', url: '/admin/audit-log' }),
  pathnetMetrics: () => apiRequest({ method: 'GET', url: '/admin/pathnet/metrics' }),
  readiness: () => apiRequest({ method: 'GET', url: '/ready' }),
  metadata: () => apiRequest({ method: 'GET', url: '/meta' }),
};
