import { Router } from "express";
import { queryAs } from "../db";
import { asyncHandler } from "../asyncHandler";
import { requireStaff, requireRole } from "../auth/middleware";
import { mapStaff, type LoyaltyTransactionRow, type StaffRow } from "../mappers";
import { AppError } from "../errors";

export const staffRouter = Router();

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
    res.json(mapStaff(row));
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
    const rows = await queryAs<StaffRow>(
      "app_admin",
      { staffId: req.session!.sub },
      "select * from staff_profiles order by created_at",
    );
    res.json(rows.map(mapStaff));
  }),
);
