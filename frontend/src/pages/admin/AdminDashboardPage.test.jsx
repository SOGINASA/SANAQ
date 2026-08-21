import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { adminApi } from '../../features/admin';
import { AdminDashboardPage } from './AdminDashboardPage';

jest.mock('../../features/admin', () => ({
  adminApi: { dashboard: jest.fn(), readiness: jest.fn() },
}));

const counts = {
  users: 7,
  students: 4,
  teachers: 2,
  active_users: 6,
  classes: 3,
  modules: 5,
  published_modules: 2,
  open_ai_reports: 1,
  events: 9,
};

beforeEach(() => {
  adminApi.dashboard.mockReset();
  adminApi.readiness.mockReset();
  adminApi.readiness.mockResolvedValue({
    data: { status: 'degraded', checks: { database: 'ok', ai: 'unavailable:ollama' } },
  });
});

test('renders verified backend dashboard counts exactly', async () => {
  adminApi.dashboard.mockResolvedValue({ data: { counts, recent_activity: [] } });

  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminDashboardPage /></MemoryRouter>);

  expect(await screen.findByText('7')).toBeInTheDocument();
  expect(screen.getByText('6 активны')).toBeInTheDocument();
  expect(screen.getByText('Ограниченно')).toBeInTheDocument();
});

test('shows an error instead of zero cards for an incomplete backend payload', async () => {
  adminApi.dashboard.mockResolvedValue({
    data: { counts: { users: 7 }, recent_activity: [] },
  });

  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminDashboardPage /></MemoryRouter>);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Backend вернул неполные данные панели управления.',
  );
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});
