import { apiRequest } from '../../shared/api';

export const billingApi = {
  plans: () => apiRequest({ method: 'GET', url: '/billing/plans' }),
  subscription: () => apiRequest({ method: 'GET', url: '/billing/subscription' }),
  createPayment: (planId, idempotencyKey) => apiRequest({
    method: 'POST',
    url: '/billing/payments',
    data: { plan_id: planId },
    headers: { 'Idempotency-Key': idempotencyKey },
  }),
  payment: (paymentId) => apiRequest({ method: 'GET', url: `/billing/payments/${paymentId}` }),
  confirmDemo: (paymentId) => apiRequest({ method: 'POST', url: `/billing/payments/${paymentId}/demo-confirm` }),
  adminPayments: (status = '') => apiRequest({ method: 'GET', url: '/admin/payments', params: status ? { status } : {} }),
  adminConfirm: (paymentId) => apiRequest({ method: 'POST', url: `/admin/payments/${paymentId}/confirm` }),
  adminCancel: (paymentId) => apiRequest({ method: 'POST', url: `/admin/payments/${paymentId}/cancel` }),
};
