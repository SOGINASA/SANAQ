const base64urlToBuffer = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const bytes = window.atob(padded);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
};

const bufferToBase64url = (value) => {
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeCredentialDescriptors = (items = []) => items.map((item) => ({
  ...item,
  id: base64urlToBuffer(item.id),
}));

const serializeCredential = (credential) => {
  const response = credential.response;
  const serializedResponse = {
    clientDataJSON: bufferToBase64url(response.clientDataJSON),
  };
  if ('attestationObject' in response) {
    serializedResponse.attestationObject = bufferToBase64url(response.attestationObject);
    serializedResponse.transports = response.getTransports?.() || [];
  } else {
    serializedResponse.authenticatorData = bufferToBase64url(response.authenticatorData);
    serializedResponse.signature = bufferToBase64url(response.signature);
    serializedResponse.userHandle = response.userHandle ? bufferToBase64url(response.userHandle) : null;
  }
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment || undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: serializedResponse,
  };
};

export const isPasskeySupported = () => Boolean(
  window.PublicKeyCredential && navigator.credentials
);

export const createPasskeyCredential = async (options) => {
  const publicKey = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: { ...options.user, id: base64urlToBuffer(options.user.id) },
    excludeCredentials: decodeCredentialDescriptors(options.excludeCredentials),
  };
  const credential = await navigator.credentials.create({ publicKey });
  if (!credential) throw new Error('PASSKEY_CANCELLED');
  return serializeCredential(credential);
};

export const getPasskeyCredential = async (options) => {
  const publicKey = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: decodeCredentialDescriptors(options.allowCredentials),
  };
  const credential = await navigator.credentials.get({ publicKey });
  if (!credential) throw new Error('PASSKEY_CANCELLED');
  return serializeCredential(credential);
};

export const passkeyBrowserError = (error, t) => {
  if (!isPasskeySupported()) return t('passkeys.unsupported');
  if (error?.code === 'PASSKEY_CHALLENGE_INVALID') return t('passkeys.cancelled');
  if (error?.code === 'PASSKEY_ALREADY_EXISTS') return t('passkeys.alreadyRegistered');
  if (error?.code === 'PASSKEY_NOT_FOUND') return t('passkeys.notFound');
  if (error?.code === 'PASSKEY_VERIFICATION_FAILED') return t('passkeys.failed');
  if (error?.name === 'NotAllowedError' || error?.message === 'PASSKEY_CANCELLED') {
    return t('passkeys.cancelled');
  }
  if (error?.name === 'InvalidStateError') return t('passkeys.alreadyRegistered');
  if (error?.name === 'SecurityError') return t('passkeys.securityError');
  return error?.message || t('passkeys.failed');
};
