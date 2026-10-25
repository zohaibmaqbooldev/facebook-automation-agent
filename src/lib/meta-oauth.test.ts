import { describe, expect, it } from "vitest";
import { matchesOAuthState, parseOAuthState } from "./meta-oauth.mjs";

describe("Meta OAuth callback state", () => {
  it("accepts only a state bound to the signed-in user and nonce cookie", () => {
    const state = parseOAuthState("user-1.nonce-1.signature-1");
    expect(matchesOAuthState(state, "user-1", "nonce-1")).toBe(true);
    expect(matchesOAuthState(state, "user-2", "nonce-1")).toBe(false);
    expect(matchesOAuthState(state, "user-1", "other-nonce")).toBe(false);
  });

  it("rejects malformed or replay-unbound state values", () => {
    expect(parseOAuthState(null)).toBeNull();
    expect(parseOAuthState("user.nonce")).toBeNull();
    expect(parseOAuthState("user.nonce.signature.extra")).toBeNull();
    expect(matchesOAuthState(parseOAuthState("user.nonce.signature"), "user", undefined)).toBe(false);
  });
});
