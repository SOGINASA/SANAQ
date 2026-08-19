import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useAuthStore } from './features/auth/authStore';
import { useAccessibilityStore } from './features/accessibility/accessibilityStore';

jest.mock('./shared/api/apiClient', () => ({
  apiRequest: jest.fn(({ url }) => {
    const responses = {
      '/notifications': { data: { items: [] } },
      '/notifications/unread-count': { data: { count: 0 } },
      '/assignments': { data: { items: [] } },
      '/teachers/me/classes': { data: { items: [{ id: 'class-1', name: '9A' }] } },
      '/modules': { data: { items: [{ id: 'module-1', title: 'Алгебра' }] } },
    };
    return Promise.resolve(responses[url] || { data: {} });
  }),
}));

const setSession = (user = null) => {
  useAuthStore.setState({
    user,
    status: user ? 'authenticated' : 'anonymous',
    error: null,
    hydrate: jest.fn(),
  });
};

beforeEach(() => {
  window.history.pushState({}, '', '/');
  setSession();
  useAccessibilityStore.setState({ locale: 'ru' });
});

test('renders SANAQ landing page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Учись не больше/i })).toBeInTheDocument();
  expect(screen.getAllByText('SANAQ').length).toBeGreaterThan(0);
});

test('switches the rendered application from Russian to Kazakh', () => {
  render(<App />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Выбрать язык интерфейса' }), { target: { value: 'kk' } });
  expect(screen.getByRole('heading', { name: /Көп оқы.*Дәл оқы/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /Учись не больше/i })).not.toBeInTheDocument();
});

test('redirects an anonymous user from a protected route', () => {
  window.history.pushState({}, '', '/student/progress');
  render(<App />);
  expect(screen.getByRole('button', { name: /Войти в SANAQ/i })).toBeInTheDocument();
});

test('renders the student assistant for an authenticated student', async () => {
  setSession({ id: 'student-1', name: 'Ученик', email: 'student@example.com', role: 'student' });
  window.history.pushState({}, '', '/student/assistant');
  render(<App />);
  await act(async () => {});
  expect(screen.getByRole('heading', { name: /Чем помочь с учёбой/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/Диалог с SANA/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Сообщение для SANA/i)).toBeInTheDocument();
});

test('renders the API-backed assignments workflow for a teacher', async () => {
  setSession({ id: 'teacher-1', name: 'Учитель', email: 'teacher@example.com', role: 'teacher' });
  window.history.pushState({}, '', '/teacher/assignments');
  render(<App />);
  await act(async () => {});
  expect(screen.getByRole('heading', { name: 'Назначения' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Создать назначение/i })).toBeInTheDocument();
});
