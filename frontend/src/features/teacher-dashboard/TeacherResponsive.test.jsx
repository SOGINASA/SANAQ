import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../app/providers/I18nProvider';
import { useAccessibilityStore } from '../accessibility/accessibilityStore';
import { ClassHeatmap } from './ClassHeatmap';
import { StudentTable } from './StudentTable';

const students = [{ id: 'student-1', name: 'Alex Student', progress: 64, streak: 3, focus: 'Factoring', risk: 'attention', skills: [{ id: 'factoring', name: 'Factoring', mastery: 0.64 }] }];

beforeEach(() => useAccessibilityStore.setState({ locale: 'en' }));

const renderTeacherWidget = (widget) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><I18nProvider>{widget}</I18nProvider></MemoryRouter>);

test('student list uses cards below the desktop breakpoint and contains its table scroll', () => {
  const { container } = renderTeacherWidget(<StudentTable students={students} />);
  expect(screen.getAllByRole('button', { name: 'Open Alex Student profile' })[0].closest('.md\\:hidden')).toBeInTheDocument();
  expect(container.querySelector('.overflow-x-auto')).toHaveClass('max-w-full', 'md:block');
});

test('skill map has a compact mobile layout and a contained scroll region', () => {
  const { container } = renderTeacherWidget(<ClassHeatmap students={students} />);
  expect(screen.getAllByText('Factoring').length).toBeGreaterThan(0);
  expect(container.querySelector('.sm\\:hidden')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Scrollable class skill map' })).toHaveClass('max-w-full', 'overflow-x-auto');
});
