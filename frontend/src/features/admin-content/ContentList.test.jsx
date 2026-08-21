import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { teacherApi } from '../teacher-dashboard/teacherApi';
import { adminContentApi } from './adminContentApi';
import { ContentList } from './ContentList';

jest.mock('./adminContentApi', () => ({
  adminContentApi: {
    list: jest.fn(),
    publish: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../teacher-dashboard/teacherApi', () => ({
  teacherApi: {
    classes: jest.fn(),
    createAssignment: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { id: 'teacher-1', role: 'teacher' }, status: 'authenticated' });
  adminContentApi.list.mockResolvedValue({
    data: {
      items: [{
        id: 'module-created-by-teacher',
        title: 'Новый урок',
        description: 'Материал учителя',
        version: 1,
        status: 'published',
      }],
    },
  });
  teacherApi.classes.mockResolvedValue({ data: { items: [{ id: 'class-1', name: '9А' }] } });
  teacherApi.createAssignment.mockResolvedValue({ data: { assignment: { id: 'assignment-1' } } });
});

test('assigns a published module to a class feed from the content library', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ContentList /></MemoryRouter>);

  fireEvent.click(await screen.findByRole('button', { name: 'Действия с Новый урок' }));
  fireEvent.click(screen.getByRole('button', { name: 'Назначить классу' }));

  expect(await screen.findByRole('heading', { name: 'Добавить в ленту класса' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Добавить в ленту' }));

  await waitFor(() => expect(teacherApi.createAssignment).toHaveBeenCalledWith({
    title: 'Новый урок',
    class_id: 'class-1',
    module_id: 'module-created-by-teacher',
    due_at: null,
    status: 'published',
  }));
  expect(await screen.findByText('Урок добавлен в ленту класса')).toBeInTheDocument();
});
