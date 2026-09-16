import type pg from "pg";
import type { AuditAction } from "@lua/types";

export interface AuditEntry {
  action: AuditAction;
  actorStaffId: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Every catalog-CMS write (product_categories/products/rewards/collections)
 * and loyalty config change calls this right after its own write, inside
 * the same client/transaction where practical. Never pass secrets or raw
 * QR tokens in `metadata` — see docs/QR-SECURITY.md.
 */
export async function writeAuditLog(client: pg.PoolClient | pg.Pool, entry: AuditEntry): Promise<void> {
  await client.query(
    `insert into audit_logs (action, actor_staff_id, target_type, target_id, summary, metadata)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      entry.action,
      entry.actorStaffId,
      entry.targetType,
      entry.targetId,
      entry.summary,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ],
  );
}
