import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireRole } from "../auth/middleware";
import { AppError } from "../errors";
import { AUDIT_ACTIONS, type AuditAction } from "@lua/types";

export const adminAuditRouter = Router();

const adminOnly = requireRole("ADMIN", "OWNER");

interface AuditLogRow {
  id: string;
  action: string;
  actor_staff_id: string | null;
  actor_display_name: string | null;
  target_type: string;
  target_id: string;
  target_label: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * A human-readable name for whatever the log entry touched — never the
 * raw UUID a non-technical admin would see in `target_id` otherwise
 * (product brief §10/§11). `target_id` is stored as plain text (it can
 * be "default" for the loyalty program singleton), so the cast is
 * guarded with a UUID-shape check rather than assuming every row's
 * target_id is a real uuid.
 */
const TARGET_LABEL_SQL = `
  case
    when al.target_id !~ '^[0-9a-fA-F-]{36}$' then null
    else (
      case al.target_type
        when 'customer' then (select trim(both from (first_name || ' ' || coalesce(last_name, ''))) from customer_profiles where id = al.target_id::uuid)
        when 'staff' then (select display_name from staff_profiles where id = al.target_id::uuid)
        when 'product' then (select name ->> 'ru' from products where id = al.target_id::uuid)
        when 'product_category' then (select name ->> 'ru' from product_categories where id = al.target_id::uuid)
        when 'collection' then (select name ->> 'ru' from collections where id = al.target_id::uuid)
        when 'reward' then (select title ->> 'ru' from rewards where id = al.target_id::uuid)
        when 'reward_redemption' then (
          select r.title ->> 'ru' from reward_redemptions rr join rewards r on r.id = rr.reward_id where rr.id = al.target_id::uuid
        )
        when 'order' then (
          select coalesce(external_order_code, 'от ' || to_char(created_at, 'DD.MM.YYYY')) from orders where id = al.target_id::uuid
        )
        when 'location' then (select short_name from locations where id = al.target_id::uuid)
        when 'media_asset' then null
        else null
      end
    )
  end as target_label
`;

function isValidAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/**
 * ADMIN/OWNER only (RLS backs this up — see audit_logs_admin_only in
 * 006_rls.sql, no app_staff grant exists at all). `metadata` here is
 * always the same safe, non-secret payload writeAuditLog() accepted at
 * write time (packages/server/src/audit.ts's doc comment) — this
 * endpoint doesn't add any new exposure, it just reads back what was
 * already deliberately recorded.
 */
adminAuditRouter.get(
  "/admin/audit-log",
  adminOnly,
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;

    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    if (action !== undefined && !isValidAction(action)) {
      throw new AppError("VALIDATION", 422);
    }
    const actorStaffId = typeof req.query.actorStaffId === "string" ? req.query.actorStaffId : undefined;
    const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (action) {
      params.push(action);
      conditions.push(`al.action = $${params.length}`);
    }
    if (actorStaffId) {
      params.push(actorStaffId);
      conditions.push(`al.actor_staff_id = $${params.length}`);
    }
    if (targetType) {
      params.push(targetType);
      conditions.push(`al.target_type = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`al.created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`al.created_at <= $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

    const [rows, totalRows] = await Promise.all([
      queryAs<AuditLogRow>(
        "app_admin",
        guards,
        `select al.*, sp.display_name as actor_display_name, ${TARGET_LABEL_SQL}
         from audit_logs al
         left join staff_profiles sp on sp.id = al.actor_staff_id
         ${whereClause}
         order by al.created_at desc
         limit ${pageSize} offset ${offset}`,
        params,
      ),
      queryAs<{ total: string }>(
        "app_admin",
        guards,
        `select count(*) as total from audit_logs al ${whereClause}`,
        params,
      ),
    ]);

    res.json({
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        actorStaffId: row.actor_staff_id ?? undefined,
        actorDisplayName: row.actor_display_name ?? undefined,
        targetType: row.target_type,
        targetId: row.target_id,
        targetLabel: row.target_label ?? undefined,
        summary: row.summary,
        metadata: row.metadata ?? undefined,
        createdAt: row.created_at,
      })),
      total: Number(totalRows[0]?.total ?? 0),
      page,
      pageSize,
    });
  }),
);
