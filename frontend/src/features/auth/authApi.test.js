import { apiRequest } from '../../shared/api/apiClient';
import { tokenStorage } from '../../shared/storage/tokenStorage';
import { authApi } from './authApi';
import { createPasskeyCredential, getPasskeyCredential } from './passkeyClient';

jest.mock('../../shared/api/apiClient', () => ({ apiRequest: jest.fn() }));
jest.mock('../../shared/storage/tokenStorage', () => ({
  tokenStorage: { setAccessToken: jest.fn(), clear: jest.fn() },
}));
jest.mock('./passkeyClient', () => ({
  createPasskeyCredential: jest.fn(),
  getPasskeyCredential: jest.fn(),
}));

beforeEach(() => {
  apiRequest.mockReset();
  tokenStorage.setAccessToken.mockReset();
  createPasskeyCredential.mockReset();
  getPasskeyCredential.mockReset();
});

test('returns the authentication ceremony id without relying on browser cookies', async () => {
  apiRequest
    .mockResolvedValueOnce({ data: { options: { challenge: 'challenge' }, ceremony_id: 'ceremony-1' } })
    .mockResolvedValueOnce({ data: { access_token: 'access-token' } });
  getPasskeyCredential.mockResolvedValue({ id: 'credential-1' });

  await authApi.loginWithPasskey();

  expect(getPasskeyCredential).toHaveBeenCalledWith({ challenge: 'challenge' });
  expect(apiRequest).toHaveBeenNthCalledWith(2, {
    method: 'POST',
    url: '/auth/passkeys/authentication/verify',
    data: { credential: { id: 'credential-1' }, ceremony_id: 'ceremony-1' },
  });
  expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('access-token');
});

test('returns the registration ceremony id without relying on browser cookies', async () => {
  apiRequest
    .mockResolvedValueOnce({ data: { options: { challenge: 'challenge' }, ceremony_id: 'ceremony-2' } })
    .mockResolvedValueOnce({ data: { credential: { id: 'credential-2' } } });
  createPasskeyCredential.mockResolvedValue({ id: 'credential-2' });

  await authApi.addPasskey('Touch ID');

  expect(createPasskeyCredential).toHaveBeenCalledWith({ challenge: 'challenge' });
  expect(apiRequest).toHaveBeenNthCalledWith(2, {
    method: 'POST',
    url: '/auth/passkeys/registration/verify',
    data: {
      credential: { id: 'credential-2' },
      ceremony_id: 'ceremony-2',
      name: 'Touch ID',
    },
  });
});
