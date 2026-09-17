import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireStaff, requireRole } from "../auth/middleware";
import { mapStaff, type LoyaltyTransactionRow, type StaffRow } from "../mappers";
import { AppError } from "../errors";

export const staffRouter = Router();

async function loadLocationIds(
  role: Parameters<typeof queryAs>[0],
  guards: Parameters<typeof queryAs>[1],
  staffIds: string[],
): Promise<Map<string, string[]>> {
  if (staffIds.length === 0) return new Map();
  // Ordered by the location's own display order (not insertion order,
  // which Postgres never guarantees anyway) so "Достык, Кок-Тобе" reads
  // the same and stays stable across refreshes everywhere it's joined
  // into a single string (Admin's Staff table, e2e assertions, etc).
  const rows = await queryAs<{ staff_id: string; location_id: string }>(
    role,
    guards,
    `select sl.staff_id, sl.location_id
     from staff_locations sl join locations l on l.id = sl.location_id
     where sl.staff_id = any($1)
     order by l.sort_order`,
    [staffIds],
  );
  const byStaff = new Map<string, string[]>();
  for (const row of rows) {
    const list = byStaff.get(row.staff_id) ?? [];
    list.push(row.location_id);
    byStaff.set(row.staff_id, list);
  }
  return byStaff;
}

staffRouter.get(
  "/staff/me",
  requireStaff,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    const rows = await queryAs<StaffRow>(
      "app_staff",
      { staffId },
      "select * from staff_profiles where id = $1",
      [staffId],
    );
    const row = rows[0];
    if (!row) throw new AppError("VALIDATION", 404);
    const locationIds = await loadLocationIds("app_staff", { staffId }, [row.id]);
    res.json(mapStaff(row, locationIds.get(row.id)));
  }),
);

/** Every loyalty operation this staff member personally performed — see infra/db/migrations/008. */
staffRouter.get(
  "/staff/shift-log",
  requireStaff,
  asyncHandler(async (req, res) => {
    const staffId = req.session!.sub;
    const rows = await queryAs<LoyaltyTransactionRow>(
      "app_staff",
      { staffId },
      "select * from loyalty_transactions where performed_by_staff_id = $1 order by created_at desc limit 50",
      [staffId],
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        points: row.points,
        type: row.type,
        createdAt: row.created_at,
      })),
    );
  }),
);

staffRouter.get(
  "/admin/staff",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const guards = { staffId: req.session!.sub };
    const rows = await queryAs<StaffRow>("app_admin", guards, "select * from staff_profiles order by created_at");
    const locationIds = await loadLocationIds("app_admin", guards, rows.map((r) => r.id));
    res.json(rows.map((row) => mapStaff(row, locationIds.get(row.id))));
  }),
);
