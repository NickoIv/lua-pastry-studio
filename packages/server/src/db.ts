import pg from "pg";
import { env } from "./env";
import { AppError, mapPostgresError } from "./errors";

export const pool = new pg.Pool({ connectionString: env.databaseUrl });
pool.on("error", (err) => {
  // An idle pooled client dying (e.g. the dev Postgres restarting) must
  // not crash the whole server — the next checkout just reconnects.
  console.error("[lua-server] idle pg client error:", err.message);
});

export type SessionRole = "app_customer" | "app_staff" | "app_admin";

export interface SessionGuards {
  customerId?: string;
  staffId?: string;
}

/**
 * Every request that touches the database runs inside one transaction
 * that (a) SETs LOCAL ROLE to the caller's session role and (b) sets the
 * `app.customer_id` / `app.staff_id` GUCs the RLS policies and
 * SECURITY DEFINER functions in infra/db/migrations key off of — always
 * from the server's own verified JWT, never from a request body/header.
 * See docs/ARCHITECTURE.md §13.
 */
export async function withRole<T>(
  role: SessionRole,
  guards: SessionGuards,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${role}`);
    if (guards.customerId) {
      await client.query("SELECT set_config('app.customer_id', $1, true)", [
        guards.customerId,
      ]);
    }
    if (guards.staffId) {
      await client.query("SELECT set_config('app.staff_id', $1, true)", [guards.staffId]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw mapPostgresError(error);
  } finally {
    client.release();
  }
}

/** Convenience for a single SELECT under an authenticated session role. */
export async function queryAs<T extends pg.QueryResultRow = pg.QueryResultRow>(
  role: SessionRole,
  guards: SessionGuards,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withRole(role, guards, async (client) => {
    const result = await client.query<T>(sql, params);
    return result.rows;
  });
}

export { AppError };
