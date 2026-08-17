import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SANAQ landing page', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { name: /Учись не больше/i })).toBeInTheDocument();
  expect(screen.getAllByText('SANAQ').length).toBeGreaterThan(0);
});

test('renders the standalone student assistant route', () => {
  window.history.pushState({}, '', '/student/assistant');
  render(<App />);
  expect(screen.getByRole('heading', { name: /Чем помочь с учёбой/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/Диалог с SANA/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Сообщение для SANA/i)).toBeInTheDocument();
});

test('renders the teacher assignments workflow', () => {
  window.history.pushState({}, '', '/teacher/assignments');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Назначения' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Создать назначение/i })).toBeInTheDocument();
});

test('renders the AI study plan with one clear next action', () => {
  window.history.pushState({}, '', '/student/path');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'План учёбы' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Сегодня' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Продолжить урок/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Настроить план/i })).toBeInTheDocument();
});

test('renders transparent AI plan generation progress', () => {
  window.history.pushState({}, '', '/student/generating-plan');
  render(<App />);
  expect(screen.getByRole('heading', { name: /Создаём твой план/i })).toBeInTheDocument();
  expect(screen.getByRole('list', { name: /Этапы создания плана/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Пропустить ожидание/i })).toBeInTheDocument();
});

test('renders the simplified knowledge map sections', () => {
  window.history.pushState({}, '', '/student/knowledge-map');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Карта знаний' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Текущий навык' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Уже освоено' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Откроется позже' })).toBeInTheDocument();
});
