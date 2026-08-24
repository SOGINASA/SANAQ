import { createPasskeyCredential, getPasskeyCredential, isPasskeySupported } from './passkeyClient';

const bytes = (...values) => new Uint8Array(values).buffer;

beforeEach(() => {
  Object.defineProperty(window, 'PublicKeyCredential', {
    configurable: true,
    value: function PublicKeyCredential() {},
  });
});

afterEach(() => {
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: undefined });
  delete window.PublicKeyCredential;
});

test('decodes authentication options and serializes the assertion', async () => {
  const get = jest.fn().mockResolvedValue({
    id: 'credential-id',
    rawId: bytes(4, 5, 6),
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: bytes(1),
      authenticatorData: bytes(2),
      signature: bytes(3),
      userHandle: bytes(7),
    },
  });
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { get } });

  expect(isPasskeySupported()).toBe(true);
  const result = await getPasskeyCredential({ challenge: 'AQID', allowCredentials: [] });

  expect(get.mock.calls[0][0].publicKey.challenge).toEqual(new Uint8Array([1, 2, 3]));
  expect(result).toMatchObject({
    id: 'credential-id',
    rawId: 'BAUG',
    response: {
      clientDataJSON: 'AQ',
      authenticatorData: 'Ag',
      signature: 'Aw',
      userHandle: 'Bw',
    },
  });
});

test('decodes registration user and serializes authenticator transports', async () => {
  const create = jest.fn().mockResolvedValue({
    id: 'new-credential',
    rawId: bytes(8),
    type: 'public-key',
    authenticatorAttachment: 'platform',
    getClientExtensionResults: () => ({ credProps: { rk: true } }),
    response: {
      clientDataJSON: bytes(9),
      attestationObject: bytes(10),
      getTransports: () => ['internal'],
    },
  });
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create } });

  const result = await createPasskeyCredential({
    challenge: 'AQ',
    user: { id: 'Ag', name: 'student@example.com' },
    excludeCredentials: [{ id: 'Aw', type: 'public-key' }],
  });

  const publicKey = create.mock.calls[0][0].publicKey;
  expect(publicKey.user.id).toEqual(new Uint8Array([2]));
  expect(publicKey.excludeCredentials[0].id).toEqual(new Uint8Array([3]));
  expect(result.response.transports).toEqual(['internal']);
});
