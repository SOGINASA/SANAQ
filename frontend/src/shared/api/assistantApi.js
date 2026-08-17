import { env } from '../config/env';
import { tokenStorage } from '../storage/tokenStorage';
import { ApiError } from './apiError';
import { apiRequest } from './apiClient';

export const assistantApi = {
  conversations: () => apiRequest({ method: 'GET', url: '/ai/conversations' }),
  createConversation: (payload) =>
    apiRequest({ method: 'POST', url: '/ai/conversations', data: payload }),
  conversation: (conversationId) =>
    apiRequest({ method: 'GET', url: `/ai/conversations/${conversationId}` }),

  async streamMessage(conversationId, content, { onToken, onDone, signal } = {}) {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      throw new ApiError({
        code: 'AUTH_REQUIRED',
        status: 401,
        message: 'Войди в аккаунт ученика, чтобы общаться с SANA.',
      });
    }

    const response = await fetch(
      `${env.aiStreamUrl}/ai/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: {
          Accept: 'text/event-stream',
          'Accept-Language': window.localStorage.getItem('sanaq.locale') || env.defaultLocale,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, stream: true }),
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new ApiError({
        code: payload?.error?.code || 'AI_REQUEST_FAILED',
        message: payload?.error?.message || `Не удалось получить ответ SANA (${response.status})`,
        status: response.status,
        requestId: payload?.error?.request_id,
      });
    }
    if (!response.body) {
      throw new ApiError({ code: 'STREAM_UNAVAILABLE', message: 'Браузер не поддерживает потоковый ответ.' });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    const processEvent = (block) => {
      const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() || 'message';
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data) return;
      let payload;
      try {
        payload = JSON.parse(data);
      } catch (_error) {
        throw new ApiError({
          code: 'INVALID_STREAM_EVENT',
          message: 'SANA вернула повреждённый потоковый ответ.',
        });
      }
      if (event === 'error') {
        throw new ApiError({
          code: payload.code || 'AI_STREAM_INTERRUPTED',
          message: payload.message || 'Потоковый ответ SANA прервался.',
        });
      }
      if (event === 'token') onToken?.(payload.text || '');
      if (event === 'done') {
        completed = true;
        onDone?.(payload);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      events.forEach(processEvent);
      if (done) break;
    }
    if (buffer.trim()) processEvent(buffer);
    if (!completed) {
      throw new ApiError({
        code: 'AI_STREAM_INTERRUPTED',
        message: 'Потоковый ответ SANA завершился преждевременно.',
      });
    }
  },
};
