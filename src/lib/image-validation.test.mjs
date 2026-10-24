import test from "node:test";
import assert from "node:assert/strict";
import { matchesImageSignature } from "./image-validation.mjs";

test("validates PNG, JPEG and WEBP signatures", () => {
  assert.equal(matchesImageSignature("image/png", Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), true);
  assert.equal(matchesImageSignature("image/jpeg", Buffer.from([0xff,0xd8,0xff,0xe0])), true);
  assert.equal(matchesImageSignature("image/webp", Buffer.from("RIFF0000WEBP")), true);
});
test("rejects mismatched or short image signatures", () => {
  assert.equal(matchesImageSignature("image/png", Buffer.from("not png")), false);
  assert.equal(matchesImageSignature("image/jpeg", Buffer.from([0xff,0xd8])), false);
  assert.equal(matchesImageSignature("image/webp", Buffer.from("RIFFxxxxNOPE")), false);
  assert.equal(matchesImageSignature("image/svg+xml", Buffer.from("<svg/>")), false);
});
