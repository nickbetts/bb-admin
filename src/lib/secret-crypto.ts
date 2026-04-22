import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Derive a 32-byte key from SESSION_SECRET. We cache it per-process.
let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.SESSION_SECRET ?? "i3media-session-secret";
  cachedKey = scryptSync(secret, "i3media-secret-salt", 32);
  return cachedKey;
}

/**
 * Encrypts a UTF-8 string using AES-256-GCM. Returns `iv:tag:cipher` (hex).
 * Returns an empty string for empty input.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string produced by `encryptSecret`. Returns "" if the input is
 * empty or malformed (e.g. legacy plaintext rows).
 */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 3) return "";
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}
