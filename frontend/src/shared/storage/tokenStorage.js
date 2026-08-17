const ACCESS_TOKEN_KEY = 'sanaq.access_token';

export const tokenStorage = {
  getAccessToken() {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token) {
    if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};
