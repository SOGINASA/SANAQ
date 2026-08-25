import { apiRequest } from '../../shared/api/apiClient';

const users = ({ search = '', role = '', page = 1, pageSize = 20 } = {}) => apiRequest({
  method: 'GET',
  url: '/admin/users',
  params: { search, role, page, page_size: pageSize },
});

const allUsers = async ({ search = '', role = '', invalidMessage = 'INVALID_USER_LIST' } = {}) => {
  const pageSize = 100;
  let page = 1;
  let items = [];
  let response;
  do {
    response = await users({ search, role, page, pageSize });
    const pageItems = response.data.items;
    if (!Array.isArray(pageItems) || !Number.isInteger(response.data.total)) {
      throw new Error(invalidMessage);
    }
    items = items.concat(pageItems);
    if (!pageItems.length) break;
    page += 1;
  } while (items.length < response.data.total);
  return {
    ...response,
    data: { ...response.data, items, page: 1, page_size: pageSize },
  };
};

export const adminApi = {
  dashboard: () => apiRequest({ method: 'GET', url: '/admin/dashboard' }),
  users,
  allUsers,
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
