export const DEMO_PENDING_PAYMENT_KEY = 'sanaq-demo-pending-payment';
export const KASPI_APP_URL = 'kaspi://';
export const KASPI_WEB_URL = 'https://kaspi.kz/';

export const demoPaymentKey = (paymentId) => `sanaq-demo-kaspi-${paymentId}`;

export function rememberDemoPayment(paymentId) {
  window.sessionStorage.setItem(DEMO_PENDING_PAYMENT_KEY, paymentId);
  window.sessionStorage.setItem(demoPaymentKey(paymentId), String(Date.now()));
}

export function getPendingDemoPayment() {
  return window.sessionStorage.getItem(DEMO_PENDING_PAYMENT_KEY);
}

export function clearDemoPayment(paymentId) {
  window.sessionStorage.removeItem(demoPaymentKey(paymentId));
  if (getPendingDemoPayment() === paymentId) {
    window.sessionStorage.removeItem(DEMO_PENDING_PAYMENT_KEY);
  }
}

export function openKaspiApp() {
  let fallbackTimer;
  const stopFallback = () => {
    if (document.visibilityState === 'hidden') window.clearTimeout(fallbackTimer);
  };

  document.addEventListener('visibilitychange', stopFallback, { once: true });
  fallbackTimer = window.setTimeout(() => {
    document.removeEventListener('visibilitychange', stopFallback);
    if (document.visibilityState === 'visible') window.location.assign(KASPI_WEB_URL);
  }, 1200);

  window.location.assign(KASPI_APP_URL);
}
