import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../app/providers/I18nProvider';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { MobileNavigation } from './MobileNavigation';

const renderNavigation = (role, route) => render(<MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><I18nProvider><MobileNavigation role={role} /></I18nProvider></MemoryRouter>);

beforeEach(() => useAccessibilityStore.setState({ locale: 'ru' }));

test('student can open pages omitted from the bottom bar', () => {
  renderNavigation('student', '/student/dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'Ещё' }));
  expect(screen.getByRole('link', { name: 'Карта знаний' })).toHaveAttribute('href', '/student/knowledge-map');
  expect(screen.getByRole('link', { name: 'Прогресс' })).toHaveAttribute('href', '/student/progress');
  expect(screen.getByRole('link', { name: 'Настройки' })).toHaveAttribute('href', '/student/settings');
});

test('admin can reach secondary control-center pages', () => {
  renderNavigation('admin', '/admin/dashboard');
  fireEvent.click(screen.getByRole('button', { name: 'Ещё' }));
  expect(screen.getByRole('link', { name: 'Классы' })).toHaveAttribute('href', '/admin/classes');
  expect(screen.getByRole('link', { name: 'Модерация' })).toHaveAttribute('href', '/admin/moderation');
  expect(screen.getByRole('link', { name: 'Журнал действий' })).toHaveAttribute('href', '/admin/audit');
});
