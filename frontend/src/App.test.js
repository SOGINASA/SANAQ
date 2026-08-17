import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SANAQ landing page', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /Учись не больше/i })).toBeInTheDocument();
  expect(screen.getAllByText('SANAQ').length).toBeGreaterThan(0);
});
