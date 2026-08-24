import { useEffect, useState } from 'react';
import { Fingerprint, Trash2 } from 'lucide-react';
import { authApi } from './authApi';
import { isPasskeySupported, passkeyBrowserError } from './passkeyClient';
import { Button, Card } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function PasskeySettingsCard({ onStatus, onError }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState('');

  useEffect(() => {
    authApi.passkeys()
      .then((response) => setItems(response.data.items || []))
      .catch((error) => onError(error.message))
      .finally(() => setLoading(false));
  }, [onError]);

  const add = async () => {
    setAdding(true); onError('');
    try {
      const response = await authApi.addPasskey(t('passkeys.thisDevice'));
      setItems((current) => [response.data.credential, ...current]);
      onStatus(t('passkeys.added'));
    } catch (error) {
      onError(passkeyBrowserError(error, t));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (credential) => {
    setRemoving(credential.id); onError('');
    try {
      await authApi.removePasskey(credential.id);
      setItems((current) => current.filter((item) => item.id !== credential.id));
      onStatus(t('passkeys.removed'));
    } catch (error) {
      onError(error.message);
    } finally {
      setRemoving('');
    }
  };

  return (
    <Card className="mt-5 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><Fingerprint className="h-6 w-6 text-lavender-600" /><h2 className="text-xl font-extrabold">{t('passkeys.title')}</h2></div>
          <p className="mt-2 max-w-xl text-sm text-stone-500">{t('passkeys.description')}</p>
        </div>
        <Button type="button" variant="secondary" loading={adding} disabled={!isPasskeySupported()} onClick={add}>{t('passkeys.add')}</Button>
      </div>
      {!isPasskeySupported() && <p className="mt-4 text-sm font-semibold text-amber-800">{t('passkeys.unsupported')}</p>}
      <div className="mt-5 grid gap-2" aria-busy={loading}>
        {!loading && !items.length && <p className="text-sm text-stone-500">{t('passkeys.empty')}</p>}
        {items.map((credential) => (
          <div key={credential.id} className="flex items-center gap-3 rounded-2xl bg-stone-100 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper text-lavender-700"><Fingerprint className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><strong className="block">{credential.name}</strong><span className="text-xs text-stone-500">{new Date(credential.created_at).toLocaleDateString()}</span></div>
            <button type="button" disabled={removing === credential.id} onClick={() => remove(credential)} className="grid h-10 w-10 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label={t('passkeys.remove')}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Card>
  );
}
