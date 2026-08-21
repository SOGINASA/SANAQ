import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../app/providers/I18nProvider';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { Header } from '../layout/Header';
import { MobileNavigation } from './MobileNavigation';

const viewports = [320, 375, 768, 1024];

const setViewport = (width) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
};

const renderAt = (width, children) => {
  setViewport(width);
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>{children}</I18nProvider>
    </MemoryRouter>,
  );
};

beforeEach(() => useAccessibilityStore.setState({ locale: 'en' }));

test.each(viewports)('public header keeps login, language, and menu controls at %d px', (width) => {
  renderAt(width, <Header />);
  expect(screen.getByRole('combobox', { name: 'Select interface language' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass('h-11', 'w-11');
});

test.each(viewports.slice(0, 3))('student mobile navigation exposes secondary routes at %d px', (width) => {
  renderAt(width, <MobileNavigation role="student" />);
  const more = screen.getByRole('button', { name: 'More' });
  expect(more).toHaveClass('min-h-12');
  fireEvent.click(more);
  expect(screen.getByRole('link', { name: 'Knowledge map' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
});
