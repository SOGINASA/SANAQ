import { apiRequest } from '../../shared/api/apiClient';

export const aiTutorApi = {
  explanation: (payload) =>
    apiRequest({ method: 'POST', url: '/ai/explanations', data: payload }),
  hint: (taskId) => apiRequest({ method: 'POST', url: '/ai/hints', data: { task_id: taskId } }),
  createConversation: (payload = {}) =>
    apiRequest({ method: 'POST', url: '/ai/conversations', data: payload }),
  conversations: () => apiRequest({ method: 'GET', url: '/ai/conversations' }),
  conversation: (conversationId) =>
    apiRequest({ method: 'GET', url: `/ai/conversations/${conversationId}` }),
  message: (conversationId, payload) =>
    apiRequest({ method: 'POST', url: `/ai/conversations/${conversationId}/messages`, data: payload }),
  report: (feedbackId, payload) =>
    apiRequest({ method: 'POST', url: `/ai/feedback/${feedbackId}/report`, data: payload }),
};
