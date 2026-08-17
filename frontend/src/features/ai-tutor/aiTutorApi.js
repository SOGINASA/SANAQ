import { apiRequest } from '../../shared/api/apiClient';

export const aiTutorApi = {
  explanation: (payload) =>
    apiRequest({ method: 'POST', url: '/ai/explanations', data: payload }),
  hint: (taskId) => apiRequest({ method: 'POST', url: '/ai/hints', data: { task_id: taskId } }),
};
