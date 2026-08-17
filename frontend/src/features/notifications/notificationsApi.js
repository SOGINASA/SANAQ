import { apiRequest } from '../../shared/api/apiClient';

export const notificationsApi = {
  list: () => apiRequest({ method: 'GET', url: '/notifications' }),
  unreadCount: () => apiRequest({ method: 'GET', url: '/notifications/unread-count' }),
  markRead: (id) => apiRequest({ method: 'PATCH', url: `/notifications/${id}/read` }),
  markAllRead: () => apiRequest({ method: 'POST', url: '/notifications/read-all' }),
  preferences: () => apiRequest({ method: 'GET', url: '/notification-preferences' }),
  savePreferences: (payload) => apiRequest({ method: 'PATCH', url: '/notification-preferences', data: payload }),
};
