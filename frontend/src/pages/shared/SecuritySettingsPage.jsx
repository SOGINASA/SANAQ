import { useState } from 'react';
import { PasskeySettingsCard } from '../../features/auth/PasskeySettingsCard';
import { StatusToast } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function SecuritySettingsPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <p className="eyebrow">{t('settings.eyebrow')}</p>
      <h1 className="page-title mt-3">{t('settings.title')}</h1>
      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
      <PasskeySettingsCard onStatus={setStatus} onError={setError} />
      <StatusToast message={status} onClose={() => setStatus('')} />
    </div>
  );
}
