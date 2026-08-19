import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../app/providers/I18nProvider';
import { useAccessibilityStore } from '../../features/accessibility/accessibilityStore';
import { AiCompanion } from './AiCompanion';

beforeEach(() => useAccessibilityStore.setState({ locale: 'en' }));

test('AI companion exposes a named modal, traps entry focus, and returns focus on close', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><I18nProvider><AiCompanion /></I18nProvider></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: /open SANA/i });
  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.getByRole('dialog', { name: 'SANA' })).toBeInTheDocument();
  const close = screen.getByRole('button', { name: /close/i });
  await waitFor(() => expect(close).toHaveFocus());
  expect(screen.getByRole('textbox', { name: /question/i })).toBeInTheDocument();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'SANA' })).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});
