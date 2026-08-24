import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { billingApi } from '../../features/billing/billingApi';
import { I18nContext } from '../../shared/i18n/i18n';
import { DemoCheckoutPage } from './DemoCheckoutPage';

jest.mock('../../features/billing/billingApi', () => ({
  billingApi: { payment: jest.fn(), confirmDemo: jest.fn() },
}));

const payment = {
  id: 'payment-1', status: 'pending', provider_reference: 'SANAQ-DEMO',
  plan_id: 'sana', plan: { name: { ru: 'SANA' } },
};

describe('DemoCheckoutPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    billingApi.payment.mockResolvedValue({ data: { payment } });
    billingApi.confirmDemo.mockResolvedValue({ data: { payment: { ...payment, status: 'paid' } } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('clearly completes the demo flow after returning from Kaspi', async () => {
    window.sessionStorage.setItem('sanaq-demo-kaspi-payment-1', 'opened');
    render(<I18nContext.Provider value={{ locale: 'ru' }}><MemoryRouter initialEntries={['/student/billing/demo/payment-1']}><Routes><Route path="/student/billing/demo/:paymentId" element={<DemoCheckoutPage processingDelayMs={1} />} /></Routes></MemoryRouter></I18nContext.Provider>);

    expect(await screen.findByText('Проверяем оплату')).toBeInTheDocument();
    expect(billingApi.confirmDemo).not.toHaveBeenCalled();

    await waitFor(() => expect(billingApi.confirmDemo).toHaveBeenCalledWith('payment-1'));
    expect(await screen.findByText('Добро пожаловать в SANAQ!')).toBeInTheDocument();
    expect(screen.getByText(/Банковская операция не проводилась/)).toBeInTheDocument();
  });
});
