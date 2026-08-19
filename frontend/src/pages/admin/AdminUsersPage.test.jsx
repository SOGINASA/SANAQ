import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { adminApi } from '../../features/admin';
import { AdminUsersPage } from './AdminUsersPage';

jest.mock('../../features/admin', () => ({
  adminApi: {
    users: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updateUserStatus: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const user = (id) => ({
  id: `user-${id}`,
  name: `User ${id}`,
  email: `user-${id}@example.com`,
  role: 'student',
  is_active: true,
});

beforeEach(() => {
  adminApi.users.mockReset();
  adminApi.users.mockImplementation(({ page }) => Promise.resolve({
    data: page === 1
      ? { items: Array.from({ length: 20 }, (_, index) => user(index + 1)), total: 21 }
      : { items: [user(21)], total: 21 },
  }));
});

test('navigates to the next server-backed users page', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminUsersPage /></MemoryRouter>);

  expect(await screen.findByText('Страница 1 из 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(await screen.findByText('User 21')).toBeInTheDocument();
  expect(screen.getByText('Страница 2 из 2')).toBeInTheDocument();
  expect(adminApi.users).toHaveBeenLastCalledWith({
    search: '', role: '', page: 2, pageSize: 20,
  });
});

test('opens the localized create-user dialog without crashing', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminUsersPage /></MemoryRouter>);

  await screen.findByText('Страница 1 из 2');
  fireEvent.click(screen.getByRole('button', { name: 'Новый пользователь' }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText('Имя')).toBeInTheDocument();
  expect(screen.getByLabelText('Временный пароль')).toBeInTheDocument();
});
