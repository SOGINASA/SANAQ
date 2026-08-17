import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SANAQ authentication screen', async () => {
  render(<App />);
  expect(await screen.findByText(/Понимай, что учить следующим/i)).toBeInTheDocument();
});
