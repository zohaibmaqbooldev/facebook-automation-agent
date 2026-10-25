export function parseOAuthState(value) {
  const parts = typeof value === "string" ? value.split(".") : [];
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  const [userId, nonce, signature] = parts;
  return { userId, nonce, signature };
}

export function matchesOAuthState(state, userId, cookieNonce) {
  return Boolean(state && state.userId === userId && state.nonce === cookieNonce);
}
