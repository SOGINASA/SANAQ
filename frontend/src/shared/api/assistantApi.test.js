import { TextDecoder } from 'util';
import { assistantApi } from './assistantApi';
import { tokenStorage } from '../storage/tokenStorage';

global.TextDecoder = TextDecoder;

const bodyFrom = (...chunks) => {
  let index = 0;
  return {
    getReader: () => ({
      read: jest.fn(async () => {
        if (index >= chunks.length) return { done: true };
        return { done: false, value: Uint8Array.from(Buffer.from(chunks[index++], 'utf8')) };
      }),
    }),
  };
};

beforeEach(() => {
  tokenStorage.clear();
  global.fetch = jest.fn();
});

afterAll(() => tokenStorage.clear());

test('parses SSE events split across network chunks', async () => {
  tokenStorage.setAccessToken('qa-token');
  global.fetch.mockResolvedValue({
    ok: true,
    body: bodyFrom(
      'event: token\r\ndata: {"text":"one "}\r\n\r\nevent: tok',
      'en\ndata: {"text":"two"}\n\nevent: done\ndata: {"message":{"id":"m1"}}\n\n',
    ),
  });
  const tokens = [];
  const completed = [];

  await assistantApi.streamMessage('c1', 'help', {
    onToken: (token) => tokens.push(token),
    onDone: (event) => completed.push(event),
  });

  expect(tokens.join('')).toBe('one two');
  expect(completed).toEqual([{ message: { id: 'm1' } }]);
});

test('surfaces an SSE error event', async () => {
  tokenStorage.setAccessToken('qa-token');
  global.fetch.mockResolvedValue({
    ok: true,
    body: bodyFrom(
      'event: token\ndata: {"text":"partial"}\n\n',
      'event: error\ndata: {"code":"AI_STREAM_INTERRUPTED","message":"stream failed"}\n\n',
    ),
  });

  await expect(assistantApi.streamMessage('c1', 'help')).rejects.toMatchObject({
    code: 'AI_STREAM_INTERRUPTED',
    message: 'stream failed',
  });
});

test('rejects a stream that ends without a done event', async () => {
  tokenStorage.setAccessToken('qa-token');
  global.fetch.mockResolvedValue({
    ok: true,
    body: bodyFrom('event: token\ndata: {"text":"partial"}\n\n'),
  });

  await expect(assistantApi.streamMessage('c1', 'help')).rejects.toMatchObject({
    code: 'AI_STREAM_INTERRUPTED',
  });
});

test('rejects malformed SSE JSON', async () => {
  tokenStorage.setAccessToken('qa-token');
  global.fetch.mockResolvedValue({
    ok: true,
    body: bodyFrom('event: token\ndata: not-json\n\n'),
  });

  await expect(assistantApi.streamMessage('c1', 'help')).rejects.toMatchObject({
    code: 'INVALID_STREAM_EVENT',
  });
});

test('rejects before fetch when access token is absent', async () => {
  await expect(assistantApi.streamMessage('c1', 'help')).rejects.toMatchObject({
    code: 'AUTH_REQUIRED',
    status: 401,
  });
  expect(global.fetch).not.toHaveBeenCalled();
});
