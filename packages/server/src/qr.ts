import { randomBytes, createHash } from "node:crypto";

/**
 * The raw token is 256 bits of CSPRNG output, base64url-encoded — this
 * is what gets embedded in the QR image and never stored anywhere. Only
 * its SHA-256 digest is written to qr_sessions, so a database read
 * (backup, leaked snapshot, curious admin query) can never recover a
 * usable token. See docs/QR-SECURITY.md.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function digestToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
