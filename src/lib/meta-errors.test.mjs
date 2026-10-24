import test from "node:test";
import assert from "node:assert/strict";
import { isMetaTokenExpiry } from "./meta-errors.mjs";

test("recognizes Meta expired-session errors", () => {
  assert.equal(isMetaTokenExpiry({code:190}), true);
  assert.equal(isMetaTokenExpiry({code:102}), true);
  assert.equal(isMetaTokenExpiry({code:10}), false);
  assert.equal(isMetaTokenExpiry(new Error("network timeout")), false);
  assert.equal(isMetaTokenExpiry(null), false);
});
