export type ParsedOAuthState = { userId: string; nonce: string; signature: string };
export function parseOAuthState(value: string | null): ParsedOAuthState | null;
export function matchesOAuthState(state: ParsedOAuthState | null, userId: string, cookieNonce: string | undefined): boolean;
