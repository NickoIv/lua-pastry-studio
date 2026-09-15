import { queryAs, type SessionGuards, type SessionRole } from "./db";

/**
 * QR TTL is read fresh (not cached) so an Admin change takes effect on
 * the very next QR issued — see docs/ARCHITECTURE.md §16.
 */
export async function getQrTokenTtlSeconds(
  role: SessionRole,
  guards: SessionGuards,
): Promise<number> {
  const rows = await queryAs<{ qr_token_ttl_seconds: number }>(
    role,
    guards,
    "select qr_token_ttl_seconds from loyalty_programs where id = 'default'",
  );
  return rows[0]?.qr_token_ttl_seconds ?? 90;
}
