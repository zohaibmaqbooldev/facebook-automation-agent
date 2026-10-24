import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const key = () => { const value = process.env.APP_ENCRYPTION_KEY; if (!value || !/^[a-f\d]{64}$/i.test(value)) throw new Error("APP_ENCRYPTION_KEY must be a 32-byte hex value"); return Buffer.from(value, "hex"); };
export function encryptSecret(plain: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]); return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":"); }
export function decryptSecret(value: string) { const [iv, tag, data] = value.split(":"); const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex")); decipher.setAuthTag(Buffer.from(tag, "hex")); return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString("utf8"); }
export function signState(value: string) { return createHmac("sha256", process.env.META_APP_SECRET!).update(value).digest("hex"); }
export function validSignature(value: string, signature: string) { const expected = Buffer.from(signState(value), "hex"); const actual = Buffer.from(signature, "hex"); return expected.length === actual.length && timingSafeEqual(expected, actual); }
