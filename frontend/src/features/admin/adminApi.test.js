import { apiRequest } from '../../shared/api/apiClient';
import { adminApi } from './adminApi';

jest.mock('../../shared/api/apiClient', () => ({ apiRequest: jest.fn() }));

beforeEach(() => apiRequest.mockReset());

test('requests the selected users page and page size', async () => {
  apiRequest.mockResolvedValue({ data: { items: [], total: 0 } });

  await adminApi.users({ search: 'teacher', role: 'teacher', page: 3, pageSize: 20 });

  expect(apiRequest).toHaveBeenCalledWith({
    method: 'GET',
    url: '/admin/users',
    params: { search: 'teacher', role: 'teacher', page: 3, page_size: 20 },
  });
});

test('loads every users page for complete teacher selectors', async () => {
  apiRequest
    .mockResolvedValueOnce({ data: { items: Array.from({ length: 100 }, (_, id) => ({ id })), total: 101 } })
    .mockResolvedValueOnce({ data: { items: [{ id: 100 }], total: 101 } });

  const response = await adminApi.allUsers({ role: 'teacher' });

  expect(response.data.items).toHaveLength(101);
  expect(apiRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({
    params: expect.objectContaining({ role: 'teacher', page: 2, page_size: 100 }),
  }));
});

test('rejects an invalid users payload instead of inventing an empty list', async () => {
  apiRequest.mockResolvedValue({ data: {} });

  await expect(adminApi.allUsers({ role: 'teacher' })).rejects.toThrow(
    'INVALID_USER_LIST',
  );
});
